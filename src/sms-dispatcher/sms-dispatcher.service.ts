import { Injectable, Logger } from '@nestjs/common';
import { SmsProviderService } from '../sms-provider/sms-provider.service';
import { SmsProviderOnbukaService } from '../sms-provider-onbuka/sms-provider-onbuka.service';
import { SmsTrackingService } from '../sms-tracking/sms-tracking.service';
import { BukaService } from '../sms-provider/buka/buka.service';
import { SmppService } from '../sms-provider/smpp/smpp.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsNotificationBatch } from '../sms-notification-batch/entities/sms-notification-batch.entity';

@Injectable()
export class SmsDispatcherService {
  private readonly logger = new Logger(SmsDispatcherService.name);

  constructor(
    private readonly smsProviderService: SmsProviderService,
    private readonly smsProviderOnbukaService: SmsProviderOnbukaService,
    private readonly smsTrackingService: SmsTrackingService,
    private readonly bukaService: BukaService,
    private readonly smppService: SmppService,
    @InjectRepository(SmsNotificationBatch)
    private readonly smsBatchRepository: Repository<SmsNotificationBatch>,
  ) {}

  /**
   * 派发短信发送请求到适当的服务提供商
   * @param messageId 短信消息ID
   * @param providerId 服务提供商ID
   * @param phoneNumber 目标手机号
   * @param content 短信内容
   * @param sender 发送方标识（可选）
   */
  async dispatchSms(
    messageId: number,
    providerId: number,
    phoneNumber: string,
    content: string,
  ): Promise<{
    success: boolean;
    providerMessageId?: string;
    errorMessage?: string;
  }> {
    try {
      // 根据providerId获取提供商信息
      const provider = await this.smsProviderService.findById(providerId);

      if (!provider) {
        throw new Error(`Provider with ID ${providerId} not found`);
      }

      // 详细记录派发信息
      this.logger.log(
        `Dispatching SMS to provider ${providerId} (${provider.name}), phone: ${phoneNumber}, messageId: ${messageId}`,
      );

      // 获取租户ID和用户ID，这里使用默认值1
      // 实际生产环境中应该从请求上下文获取或从数据库查询
      const tenantId = 1;
      const userId = 1;

      // 根据提供商类型选择相应的服务 (使用 name 字段)
      const providerName = provider.name.toLowerCase(); // 使用 name 并转小写比较
      this.logger.log(`Using provider type: ${providerName}`);

      switch (providerName) {
        case 'onbuka':
          // 使用BukaService代替SmsProviderOnbukaService
          return await this.bukaService.send(
            messageId,
            phoneNumber,
            content,
            tenantId,
            userId,
          );
        case 'smpp':
          this.logger.log(`Sending SMS via SMPP, messageId: ${messageId}`);
          // 使用SmppService发送短信
          return await this.smppService.send(
            messageId,
            phoneNumber,
            content,
            tenantId,
            userId,
          );
        // 可以扩展更多提供商
        // case 'aliyun':
        //   return await this.smsProviderAliyunService.sendSms(...);
        default:
          this.logger.error(`Provider type ${provider.name} is not supported`);
          throw new Error(`Provider type ${provider.name} is not supported`); // 使用 name
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to dispatch SMS to provider ${providerId}: ${errorMsg}`,
        errorStack,
      );

      // 记录错误到跟踪服务
      if (this.smsTrackingService.trackSmsError) {
        // 检查方法是否存在
        await this.smsTrackingService.trackSmsError(
          messageId,
          `Dispatch error: ${errorMsg}`,
        );
      } else {
        this.logger.warn(
          `SMS error tracking not implemented for message: ${messageId}`,
        );
      }

      return {
        success: false,
        errorMessage: `Failed to dispatch: ${errorMsg}`,
      };
    }
  }

  /**
   * 查询短信状态
   * @param messageId 短信消息ID
   * @param providerId 服务提供商ID
   * @param providerMessageId 服务提供商返回的消息ID
   * @returns 状态查询结果
   */
  async queryMessageStatus(
    messageId: number,
    providerId: number,
    providerMessageId: string,
    batchId?: number, // 新增批次ID参数
  ): Promise<{
    success: boolean;
    status: string;
    statusUpdateTime?: Date;
    errorMessage?: string;
  }> {
    try {
      // 根据providerId获取提供商信息
      const provider = await this.smsProviderService.findById(providerId);

      if (!provider) {
        throw new Error(`Provider with ID ${providerId} not found`);
      }

      // 根据提供商类型选择相应的服务
      switch (provider.name.toLowerCase()) {
        case 'onbuka':
          // 如果有批次ID，尝试通过时间范围查询
          if (batchId) {
            return await this.queryMessageStatusByBatch(
              messageId,
              providerId,
              providerMessageId,
              batchId,
            );
          }

          // 否则返回模拟数据
          return {
            success: true,
            status: 'sent', // 模拟状态查询结果
            statusUpdateTime: new Date(),
          };
        // 可以扩展更多提供商
        default:
          throw new Error(
            `Provider type ${provider.name} is not supported for status query`,
          );
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to query message status for provider ${providerId}: ${errorMsg}`,
        errorStack,
      );

      return {
        success: false,
        status: 'unknown',
        errorMessage: `Status query failed: ${errorMsg}`,
      };
    }
  }

  /**
   * 通过批次ID和时间范围查询短信状态
   * @param messageId 短信消息ID
   * @param providerId 服务提供商ID
   * @param providerMessageId 服务提供商返回的消息ID
   * @param batchId 批次ID
   */
  private async queryMessageStatusByBatch(
    messageId: number,
    providerId: number,
    providerMessageId: string,
    batchId: number,
  ): Promise<{
    success: boolean;
    status: string;
    statusUpdateTime?: Date;
    errorMessage?: string;
  }> {
    try {
      // 查询批次信息获取发送时间
      const batch = await this.smsBatchRepository.findOne({
        where: { id: batchId },
      });

      if (!batch) {
        throw new Error(`Batch with ID ${batchId} not found`);
      }

      // 使用批次创建时间作为起始时间，确保为UTC格式
      const startTimeLocal = batch.createTime;
      // 将批次创建时间转换为UTC时间
      const startTime = new Date(
        Date.UTC(
          startTimeLocal.getFullYear(),
          startTimeLocal.getMonth(),
          startTimeLocal.getDate(),
          startTimeLocal.getHours(),
          startTimeLocal.getMinutes(),
          startTimeLocal.getSeconds(),
        ),
      );

      // 结束时间为发送时间加1小时，确保为UTC格式
      const endTime = new Date(startTime.getTime() + 10 * 1000);

      console.log(
        `===[Buka查询]===本地开始时间: ${startTimeLocal.toISOString()}, UTC开始时间: ${startTime.toISOString()}, UTC结束时间: ${endTime.toISOString()}, 批次ID: ${batchId}`,
      );

      // 获取租户ID和用户ID，这里使用默认值1
      // 实际生产环境中应该从请求上下文获取或从数据库查询
      const tenantId = 1;
      const userId = 1;

      // 调用BukaService的按时间范围查询方法
      const queryResult = await this.bukaService.queryMessageStatusByTimeRange(
        startTime,
        endTime,
        0, // 起始索引为0
        tenantId,
        userId,
      );

      // 在结果中查找对应的消息
      const messageResult = queryResult.results.find(
        (result) => result.messageId === providerMessageId,
      );

      if (messageResult) {
        // 找到对应消息的状态
        return {
          success: true,
          status: messageResult.status,
          statusUpdateTime: messageResult.sendTime || new Date(),
        };
      } else {
        // 没有找到对应消息，可能需要再次尝试查询或使用其他方法
        this.logger.warn(
          `Message with ID ${providerMessageId} not found in time range query results`,
        );
        return {
          success: false,
          status: 'unknown',
          errorMessage: `Message not found in Buka response`,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error querying message status by batch: ${errorMsg}`);
      return {
        success: false,
        status: 'unknown',
        errorMessage: `Batch query failed: ${errorMsg}`,
      };
    }
  }
}
