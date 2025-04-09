import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SmsDispatchBatch } from '../sms/entities/sms-dispatch-batch.entity';
import {
  SmsMessage,
  SmsStatus,
} from '../sms-message/entities/sms-message.entity';
import {
  SmsNotificationBatch,
  BatchStatus,
} from '../sms-notification-batch/entities/sms-notification-batch.entity';

@Injectable()
export class SmsTrackingService {
  private readonly logger = new Logger(SmsTrackingService.name);

  constructor(
    @InjectRepository(SmsDispatchBatch)
    private readonly smsDispatchBatchRepository: Repository<SmsDispatchBatch>,
    @InjectRepository(SmsNotificationBatch)
    private readonly smsBatchRepository: Repository<SmsNotificationBatch>,
    @InjectRepository(SmsMessage)
    private readonly smsMessageRepository: Repository<SmsMessage>,
  ) {}

  // --- Dispatch Batch Methods ---

  async createDispatchBatch(
    batchData: Partial<SmsDispatchBatch>,
  ): Promise<SmsDispatchBatch> {
    const batch = this.smsDispatchBatchRepository.create(batchData);
    return this.smsDispatchBatchRepository.save(batch);
  }

  async findDispatchBatchById(
    id: number,
  ): Promise<SmsNotificationBatch | null> {
    return this.smsBatchRepository.findOneBy({ id });
  }

  async updateDispatchBatchStatus(
    id: number,
    status: BatchStatus,
  ): Promise<void> {
    await this.smsBatchRepository.update(id, { status: status });
  }

  // --- Message Methods ---

  async createMessages(
    messagesData: Partial<SmsMessage>[],
  ): Promise<SmsMessage[]> {
    const messages = this.smsMessageRepository.create(messagesData);
    return this.smsMessageRepository.save(messages);
  }

  async findMessageById(id: number): Promise<SmsMessage | null> {
    return this.smsMessageRepository.findOne({
      where: { id },
    });
  }

  async findMessagesByBatchId(batchId: number): Promise<SmsMessage[]> {
    return this.smsMessageRepository.find({ where: { batchId } });
  }

  async updateMessageStatus(
    id: number,
    updateData: Partial<SmsMessage>,
  ): Promise<void> {
    await this.smsMessageRepository.update(id, {
      ...updateData,
      statusUpdateTime: new Date(),
    });
  }

  async updateMessagesStatusByProviderMsgIds(
    updates: { providerMsgid: string; data: Partial<SmsMessage> }[],
  ): Promise<void> {
    // This might require a more complex transaction or looping update
    // For simplicity, loop for now:
    for (const update of updates) {
      await this.smsMessageRepository.update(
        { providerMessageId: update.providerMsgid },
        update.data,
      );
    }
  }

  async findMessagesByProviderMsgIds(
    providerMsgids: string[],
  ): Promise<SmsMessage[]> {
    return this.smsMessageRepository.find({
      where: {
        providerMessageId: In(providerMsgids),
      },
    });
  }

  // 记录短信错误
  async trackSmsError(messageId: number, errorMessage: string): Promise<void> {
    try {
      this.logger.debug(
        `Recording error for SMS message ${messageId}: ${errorMessage}`,
      );

      await this.smsMessageRepository.update(
        { id: messageId },
        {
          status: 'failed' as SmsStatus,
          errorMessage: errorMessage,
          statusUpdateTime: new Date(),
        },
      );

      // 检查批次状态是否需要更新
      const message = await this.smsMessageRepository.findOne({
        where: { id: messageId },
        select: ['batchId'],
      });

      if (message && message.batchId && this.smsBatchRepository) {
        // 获取批次中所有消息的状态
        const batchMessages = await this.smsMessageRepository.find({
          where: { batchId: message.batchId },
          select: ['id', 'status'],
        });

        // 检查是否所有消息都已处理完成
        const allProcessed = batchMessages.every((m) =>
          ['sent', 'delivered', 'failed', 'rejected'].includes(m.status),
        );

        if (allProcessed) {
          this.logger.debug(
            `All messages in batch ${message.batchId} processed, updating batch status`,
          );

          // 计算成功和失败数量
          const successCount = batchMessages.filter((m) =>
            ['sent', 'delivered'].includes(m.status),
          ).length;

          const failureCount = batchMessages.filter((m) =>
            ['failed', 'rejected'].includes(m.status),
          ).length;

          // 根据成功和失败数量确定批次状态
          let batchStatus: BatchStatus;
          if (successCount > 0 && failureCount === 0) {
            batchStatus = 'completed';
          } else if (successCount > 0 && failureCount > 0) {
            batchStatus = 'failed'; // Assuming 'failed' covers partial failure based on enum
          } else {
            // All failed or 0 processed?
            batchStatus = 'failed';
          }

          // 更新批次状态
          await this.smsBatchRepository.update(
            { id: message.batchId },
            {
              status: batchStatus,
              processedCount: batchMessages.length,
              successCount: successCount,
              failureCount: failureCount,
              processingCompletedAt: new Date(),
            },
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to track SMS error for message ${messageId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
