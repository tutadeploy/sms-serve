import { Injectable, Logger } from '@nestjs/common';
import { SmsProviderService } from '../sms-provider/sms-provider.service';
import { SmsProviderOnbukaService } from '../sms-provider-onbuka/sms-provider-onbuka.service';
import { SmsTrackingService } from '../sms-tracking/sms-tracking.service';

@Injectable()
export class SmsDispatcherService {
  private readonly logger = new Logger(SmsDispatcherService.name);

  constructor(
    private readonly smsProviderService: SmsProviderService,
    private readonly smsProviderOnbukaService: SmsProviderOnbukaService,
    private readonly smsTrackingService: SmsTrackingService,
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
    sender?: string,
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

      // 根据提供商类型选择相应的服务 (使用 name 字段)
      switch (
        provider.name.toLowerCase() // 使用 name 并转小写比较
      ) {
        case 'onbuka':
          return await this.smsProviderOnbukaService.send(
            messageId,
            phoneNumber,
            content,
            sender,
          );
        // 可以扩展更多提供商
        // case 'aliyun':
        //   return await this.smsProviderAliyunService.sendSms(...);
        default:
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
    _messageId: number,
    providerId: number,
    _providerMessageId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
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
        case 'buka':
        case 'onbuka':
          // 假设 BukaSmsChannelService 已经注入并实现了 queryMessageStatus 方法
          // 实际项目中应该使用适当的服务
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
}
