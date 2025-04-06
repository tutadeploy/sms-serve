import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailSendJobData } from './interfaces/email-send-job-data.interface';

// 邮箱任务数据的类型守卫 (可选但推荐)
function isEmailSendJobData(data: unknown): data is EmailSendJobData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>; // 使用 Record 进行类型断言
  return (
    typeof d.batchId === 'number' &&
    typeof d.messageId === 'number' &&
    typeof d.recipient === 'string' &&
    typeof d.subject === 'string' &&
    (d.bodyHtml === undefined ||
      d.bodyHtml === null ||
      typeof d.bodyHtml === 'string') &&
    (d.bodyText === undefined ||
      d.bodyText === null ||
      typeof d.bodyText === 'string')
  );
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Process()
  async handleEmailSend(job: Job<EmailSendJobData>): Promise<void> {
    this.logger.debug(`开始处理邮件发送任务: ${job.id}`);

    const data = job.data;
    let batchIdForFinally: number | null = null;
    let messageIdForCatch: number | null = null;

    try {
      if (!isEmailSendJobData(data)) {
        this.logger.error(
          `任务 ${job.id} 邮件数据格式无效: ${JSON.stringify(data)}`,
        );
        throw new Error(`任务 ${job.id} 邮件数据格式无效`);
      }

      // 守卫通过后，可以安全获取 id

      batchIdForFinally = data.batchId;

      messageIdForCatch = data.messageId;

      const { recipient, subject, bodyHtml, bodyText } = data;

      // 添加 null 检查
      if (batchIdForFinally === null || messageIdForCatch === null) {
        this.logger.error(
          `任务 ${job.id}: 关键 ID 获取失败，即使类型守卫已通过。`,
        );
        throw new Error(`任务 ${job.id} 关键 ID 丢失`);
      }

      await this.notificationService.sendSingleEmail(
        batchIdForFinally, // 现在 TSlint 知道这里不可能是 null
        messageIdForCatch, // 现在 TSlint 知道这里不可能是 null
        recipient,
        subject,
        bodyHtml,
        bodyText,
      );
      this.logger.debug(`邮件发送任务 ${job.id} 处理成功`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `邮件发送任务 ${job.id} 处理失败: ${errorMessage}`,
        errorStack,
      );

      // 在 catch 块中也进行 null 检查 (虽然理论上 try 块获取后不会是 null)
      if (messageIdForCatch !== null) {
        try {
          await this.notificationService.updateEmailMessageStatus(
            messageIdForCatch,
            'failed',
            errorMessage,
          );
        } catch (updateError) {
          const updateMsg =
            updateError instanceof Error
              ? updateError.message
              : String(updateError);
          this.logger.error(
            `更新邮件 ${messageIdForCatch} 状态为失败时出错: ${updateMsg}`,
          );
        }
      }

      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(
          `Email processing job ${job.id} failed: ${errorMessage}`,
        );
      }
    } finally {
      // 使用在 try 块中确认的 batchIdForFinally
      if (batchIdForFinally !== null) {
        // TODO: 实现邮件批次状态更新
        // await this.checkAndUpdateEmailBatchStatus(batchIdForFinally);
      }
    }
  }

  // private async checkAndUpdateEmailBatchStatus(batchId: number): Promise<void> {
  //   // 实现类似短信批次状态更新的逻辑
  // }
}
