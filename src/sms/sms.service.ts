import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  SmsNotificationBatch,
  BatchStatus,
} from '../sms-notification-batch/entities/sms-notification-batch.entity';
import {
  SmsMessage,
  SmsStatus,
} from '../sms-message/entities/sms-message.entity';
import { SmsProvider } from '../sms-provider/entities/sms-provider.entity';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';
import { SmsDispatcherService } from '../sms-dispatcher/sms-dispatcher.service';
import { SmsSendJobData } from '../notification/interfaces/sms-send-job-data.interface';

/**
 * 短信服务 - 负责短信发送相关的核心功能
 * 从NotificationService分离出来，专注于短信业务逻辑
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @InjectRepository(SmsNotificationBatch)
    private readonly smsBatchRepository: Repository<SmsNotificationBatch>,
    @InjectRepository(SmsMessage)
    private readonly smsMessageRepository: Repository<SmsMessage>,
    @InjectRepository(SmsProvider)
    private readonly smsProviderRepository: Repository<SmsProvider>,
    @InjectQueue('sms') private readonly smsQueue: Queue<SmsSendJobData>,
    private readonly smsDispatcherService: SmsDispatcherService,
  ) {}

  /**
   * 添加消息到短信队列
   * @param batchId 批次ID
   * @param messageId 消息ID
   * @param providerId 提供商ID
   * @param recipient 接收人手机号
   * @param content 短信内容
   * @param scheduledAt 计划发送时间（可选）
   */
  async addToSmsQueue(
    batchId: number,
    messageId: number,
    providerId: number,
    recipient: string,
    content: string,
    scheduledAt?: Date,
  ): Promise<void> {
    const jobData: SmsSendJobData = {
      batchId,
      messageId,
      provider: providerId,
      recipient,
      content,
    };

    const jobOptions = scheduledAt
      ? { delay: new Date(scheduledAt).getTime() - Date.now() }
      : {};

    await this.smsQueue.add(jobData, jobOptions);
    this.logger.debug(`Added SMS job for message ${messageId} to queue`);
  }

  /**
   * 发送单条短信
   * @param batchId 批次ID
   * @param messageId 消息ID
   * @param providerId 提供商ID
   * @param recipient 接收人手机号
   * @param content 短信内容
   */
  async sendSingleSms(
    batchId: number,
    messageId: number,
    providerId: number,
    recipient: string,
    content: string,
  ): Promise<void> {
    this.logger.debug(
      `Sending SMS for message ID: ${messageId} to ${recipient} via provider ${providerId}`,
    );

    let status: SmsStatus = 'sending';
    let errorMessage: string | null = null;
    let providerMessageId: string | null = null;
    let sentAt: Date | null = null;

    try {
      // 更新消息状态为发送中
      await this.updateSmsMessageStatus(messageId, 'sending');

      // 通过分发服务发送短信
      const result = await this.smsDispatcherService.dispatchSms(
        messageId,
        providerId,
        recipient,
        content,
      );

      if (result.success) {
        providerMessageId = result.providerMessageId || null;
        status = 'sent';
        sentAt = new Date();
        this.logger.log(
          `SMS message ${messageId} sent successfully via provider ${providerId}`,
        );
      } else {
        status = 'failed';
        errorMessage = result.errorMessage || 'Failed to send SMS';
        this.logger.error(
          `Failed to send SMS message ${messageId}: ${errorMessage}`,
        );
      }
    } catch (error) {
      status = 'failed';
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error sending SMS message ${messageId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    // 更新消息最终状态
    await this.updateSmsMessageStatus(
      messageId,
      status,
      errorMessage,
      providerMessageId,
      sentAt,
    );
  }

  /**
   * 更新短信消息状态
   * @param messageId 消息ID
   * @param status 状态
   * @param errorMessage 错误信息（可选）
   * @param providerMessageId 提供商消息ID（可选）
   * @param sentAt 发送时间（可选）
   */
  async updateSmsMessageStatus(
    messageId: number,
    status: SmsStatus,
    errorMessage: string | null = null,
    providerMessageId: string | null = null,
    sentAt: Date | null = null,
  ): Promise<void> {
    try {
      const updateData: Partial<SmsMessage> = { status };

      if (errorMessage !== undefined) {
        updateData.errorMessage = errorMessage;
      }

      if (providerMessageId !== undefined) {
        updateData.providerMessageId = providerMessageId;
      }

      if (sentAt !== undefined) {
        updateData.sentAt = sentAt;
      }

      await this.smsMessageRepository.update(messageId, updateData);
      this.logger.debug(`Updated message ${messageId} status to ${status}`);
    } catch (error) {
      this.logger.error(
        `Failed to update message ${messageId} status: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // 不抛出异常，因为这是后续处理
    }
  }

  /**
   * 检查批次是否所有消息都已处理完成
   * @param batchId 批次ID
   * @returns 是否所有消息都已处理完成
   */
  async isBatchProcessingComplete(batchId: number): Promise<boolean> {
    try {
      // 获取该批次的总消息数
      const batch = await this.smsBatchRepository.findOne({
        where: { id: batchId },
      });

      if (!batch) {
        throw new BusinessException(
          `SMS batch with ID ${batchId} not found`,
          BusinessErrorCode.SMS_BATCH_NOT_FOUND,
        );
      }

      // 使用QueryBuilder查询除了queued和sending状态外的消息数量
      const processedMessageCount = await this.smsMessageRepository
        .createQueryBuilder('sms_message')
        .where('sms_message.batchId = :batchId', { batchId })
        .andWhere('sms_message.status NOT IN (:...statuses)', {
          statuses: ['queued', 'sending'],
        })
        .getCount();

      // 如果处理完成的消息数等于总消息数，则批次处理完成
      return processedMessageCount === batch.recipientCount;
    } catch (error) {
      this.logger.error(
        `Error checking batch completion status: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  /**
   * 更新批次的最终状态
   * @param batchId 批次ID
   */
  async finalizeBatchStatus(batchId: number): Promise<SmsNotificationBatch> {
    try {
      // 获取该批次所有消息的状态统计
      const statusCounts = await this.smsMessageRepository
        .createQueryBuilder('sms_message')
        .select('sms_message.status, COUNT(*) as count')
        .where('sms_message.batchId = :batchId', { batchId })
        .groupBy('sms_message.status')
        .getRawMany<{ status: SmsStatus; count: string }>();

      // 计算成功、失败、处理中的消息数
      let successCount = 0;
      let failureCount = 0;
      let pendingCount = 0;

      statusCounts.forEach((item) => {
        const count = parseInt(item.count, 10);
        if (item.status === 'sent' || item.status === 'delivered') {
          successCount += count;
        } else if (item.status === 'failed') {
          failureCount += count;
        } else {
          pendingCount += count;
        }
      });

      // 确定批次的最终状态
      let finalStatus: BatchStatus;
      if (pendingCount > 0) {
        finalStatus = 'processing';
      } else if (failureCount === 0) {
        finalStatus = 'completed';
      } else if (successCount === 0) {
        finalStatus = 'failed';
      } else {
        finalStatus = 'partially_completed';
      }

      // 更新批次状态
      const completedAt =
        finalStatus === 'completed' ||
        finalStatus === 'failed' ||
        finalStatus === 'partially_completed'
          ? new Date()
          : undefined;

      await this.smsBatchRepository.update(batchId, {
        status: finalStatus,
        completedAt,
        successCount,
        failureCount,
      });

      this.logger.log(
        `Finalized batch ${batchId} status: ${finalStatus} (success: ${successCount}, failure: ${failureCount}, pending: ${pendingCount})`,
      );

      // 返回更新后的批次
      return (await this.smsBatchRepository.findOne({
        where: { id: batchId },
      })) as SmsNotificationBatch;
    } catch (error) {
      this.logger.error(
        `Error finalizing batch status: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 获取活跃的短信服务商
   * @param providerId 服务商ID
   * @returns 短信服务商
   */
  async getSmsProvider(providerId: number): Promise<SmsProvider> {
    const provider = await this.smsProviderRepository.findOne({
      where: { id: providerId, isActive: true },
    });

    if (!provider) {
      throw new BusinessException(
        `SMS provider with ID ${providerId} not found or inactive`,
        BusinessErrorCode.SMS_PROVIDER_NOT_FOUND,
      );
    }

    return provider;
  }
}
