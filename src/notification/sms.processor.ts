import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SmsSendJobData } from './interfaces/sms-send-job-data.interface';

// 类型守卫函数
function isSmsSendJobData(data: unknown): data is SmsSendJobData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  // 使用类型断言创建一个临时对象
  const typedData = data as Record<string, unknown>;

  // 检查所有必需的字段是否存在
  if (
    !('batchId' in typedData) ||
    !('messageId' in typedData) ||
    !('provider' in typedData) ||
    !('recipient' in typedData) ||
    !('content' in typedData)
  ) {
    return false;
  }

  // 获取各字段类型
  const batchIdType = typeof typedData.batchId;
  const messageIdType = typeof typedData.messageId;
  const providerType = typeof typedData.provider;
  const recipientType = typeof typedData.recipient;
  const contentType = typeof typedData.content;

  // 检查类型，允许字符串或数字类型的ID
  if (
    (batchIdType !== 'number' && batchIdType !== 'string') ||
    (messageIdType !== 'number' && messageIdType !== 'string') ||
    (providerType !== 'number' && providerType !== 'string') ||
    recipientType !== 'string' ||
    contentType !== 'string'
  ) {
    return false;
  }

  // 如果ID字段是字符串，尝试转换为数字
  if (batchIdType === 'string') {
    const batchId = typedData.batchId as string;
    const parsed = parseInt(batchId, 10);
    if (isNaN(parsed)) {
      return false;
    }
    typedData.batchId = parsed;
  }

  if (messageIdType === 'string') {
    const messageId = typedData.messageId as string;
    const parsed = parseInt(messageId, 10);
    if (isNaN(parsed)) {
      return false;
    }
    typedData.messageId = parsed;
  }

  if (providerType === 'string') {
    const provider = typedData.provider as string;
    const parsed = parseInt(provider, 10);
    if (isNaN(parsed)) {
      return false;
    }
    typedData.provider = parsed;
  }

  return true;
}

@Processor('sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Process()
  async handleSmsSend(job: Job<SmsSendJobData>): Promise<void> {
    this.logger.debug(`开始处理短信发送任务: ${job.id}`);

    const data = job.data; // 先获取数据

    // 使用类型守卫进行运行时检查
    if (!isSmsSendJobData(data)) {
      this.logger.error(`任务 ${job.id} 数据格式无效: ${JSON.stringify(data)}`);
      throw new Error(`任务 ${job.id} 数据格式无效`);
    }

    // 在类型守卫之后，'data' 已经被安全地收窄为 SmsSendJobData
    const { batchId, messageId, provider, recipient, content } = data;

    try {
      // 调用实际的发送逻辑，使用解构后的变量
      await this.notificationService.sendSingleSms(
        batchId,
        messageId,
        provider, // provider现在是providerId
        recipient,
        content,
      );
      this.logger.debug(`短信发送任务 ${job.id} 处理成功`);
    } catch (error) {
      let errorMessage = 'Unknown error during SMS processing';
      let errorStack: string | undefined = undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      this.logger.error(
        `短信发送任务 ${job.id} 处理失败: ${errorMessage}`,
        errorStack,
      );

      try {
        // 尝试更新消息状态为失败
        await this.notificationService.updateSmsMessageStatus(
          messageId,
          'failed',
          errorMessage,
        );
      } catch (updateError) {
        // 处理更新状态时的错误
        this.logger.error(
          `更新短信 ${messageId} 状态为失败时出错: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
        );
      }

      // 抛出错误，确保是 Error 实例
      if (error instanceof Error) {
        throw error; // 如果是 Error 实例，直接重新抛出
      } else {
        // 否则，包装成新的 Error 对象再抛出
        throw new Error(`SMS processing job ${job.id} failed: ${errorMessage}`);
      }
    } finally {
      // 检查并更新批次状态
      await this.checkAndUpdateBatchStatus(batchId);
    }
  }

  // 检查并更新批次状态的方法
  private async checkAndUpdateBatchStatus(batchId: number): Promise<void> {
    try {
      // 延迟一小段时间，确保数据库更新有足够时间传播
      await new Promise((resolve) => setTimeout(resolve, 200)); // 延迟 200ms

      const isComplete =
        await this.notificationService.isBatchProcessingComplete(batchId);

      if (isComplete) {
        this.logger.log(
          `批次 ${batchId} 所有消息处理完毕，开始更新最终状态...`,
        );
        await this.notificationService.finalizeBatchStatus(batchId);
        this.logger.log(`批次 ${batchId} 最终状态更新成功。`);
      } else {
        this.logger.debug(`批次 ${batchId} 尚有消息在处理中或队列中。`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `检查或更新批次 ${batchId} 状态时出错: ${errorMessage}`,
        errorStack,
      );
    }
  }
}
