import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { In } from 'typeorm';

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
    let sendTime: Date | null = null;

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
        sendTime = new Date();
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
      sendTime,
    );
  }

  /**
   * 更新短信消息状态
   * @param messageId 消息ID
   * @param status 状态
   * @param errorMessage 错误信息（可选）
   * @param providerMessageId 提供商消息ID（可选）
   * @param sendTime 发送时间（可选）
   */
  async updateSmsMessageStatus(
    messageId: number,
    status: SmsStatus,
    errorMessage: string | null = null,
    providerMessageId: string | null = null,
    sendTime: Date | null = null,
  ): Promise<void> {
    try {
      const updateData: Partial<SmsMessage> = { status };

      if (errorMessage !== undefined) {
        updateData.errorMessage = errorMessage;
      }

      if (providerMessageId !== undefined) {
        updateData.providerMessageId = providerMessageId;
      }

      if (sendTime !== undefined) {
        updateData.sendTime = sendTime;
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
  async isAllMessagesProcessed(batchId: number): Promise<boolean> {
    const batch = await this.smsBatchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`SMS batch not found with id ${batchId}`);
    }

    const processedMessageCount = await this.smsMessageRepository.count({
      where: {
        batchId,
        status: In(['sent', 'delivered', 'failed', 'rejected']),
      },
    });

    return processedMessageCount === batch.totalRecipients;
  }

  /**
   * 更新批次的最终状态
   * @param batchId 批次ID
   */
  async updateBatchStatus(
    batchId: number,
    status: BatchStatus,
    processingCompletedAt = new Date(),
  ): Promise<void> {
    this.logger.debug(
      `Updating batch status to ${status} for batch ${batchId}`,
    );
    try {
      await this.smsBatchRepository.update(
        { id: batchId },
        {
          status,
          processingCompletedAt,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update batch status: ${error instanceof Error ? error.message : String(error)}`,
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
