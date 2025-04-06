import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TemplateService } from '../template/template.service';
import { SmsProviderService } from '../sms-provider/sms-provider.service';
import { SmsNotificationBatch } from '../sms-notification-batch/entities/sms-notification-batch.entity';
import type { BatchStatus } from '../sms-notification-batch/entities/sms-notification-batch.entity';
import {
  EmailNotificationBatch,
  EmailBatchStatus,
} from '../email-notification-batch/entities/email-notification-batch.entity';
import {
  SmsMessage,
  SmsStatus,
} from '../sms-message/entities/sms-message.entity';
import {
  EmailMessage,
  EmailStatus,
} from '../email-message/entities/email-message.entity';
import { SendSmsDto } from '../notification/dto/send-sms.dto';
import { User } from '../user/entities/user.entity';
import { SmsProvider } from '../sms-provider/entities/sms-provider.entity';
import { SmsTemplate } from '../template/entities/sms-template.entity';
import { firstValueFrom } from 'rxjs';
import { SmsSendJobData } from '../notification/interfaces/sms-send-job-data.interface';
import { EmailSendJobData } from '../notification/interfaces/email-send-job-data.interface';
import { SendEmailDto } from '../notification/dto/send-email.dto';
import { EmailTemplate } from '../email-template/entities/email-template.entity';
import { SmsDispatcherService } from '../sms-dispatcher/sms-dispatcher.service';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(SmsNotificationBatch)
    private readonly smsBatchRepository: Repository<SmsNotificationBatch>,
    @InjectRepository(EmailNotificationBatch)
    private readonly emailBatchRepository: Repository<EmailNotificationBatch>,
    @InjectRepository(SmsMessage)
    private readonly smsMessageRepository: Repository<SmsMessage>,
    @InjectRepository(EmailMessage)
    private readonly emailMessageRepository: Repository<EmailMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SmsProvider)
    private readonly smsProviderRepository: Repository<SmsProvider>,
    @InjectRepository(SmsTemplate)
    private readonly smsTemplateRepository: Repository<SmsTemplate>,
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly templateService: TemplateService,
    private readonly smsProviderService: SmsProviderService,
    @InjectQueue('sms') private readonly smsQueue: Queue,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly smsDispatcherService: SmsDispatcherService,
  ) {}

  async sendSms(
    userId: number,
    sendSmsDto: SendSmsDto,
  ): Promise<SmsNotificationBatch> {
    this.logger.log(`Processing SMS send request for user ${userId}`);
    const {
      recipients,
      content,
      templateId,
      variables,
      providerId,
      scheduledAt,
    } = sendSmsDto;

    const provider = await this.smsProviderRepository.findOne({
      where: { id: providerId, isActive: true },
    });
    if (!provider) {
      throw new BusinessException(
        `SMS provider with ID ${providerId} not found or inactive`,
        BusinessErrorCode.SMS_PROVIDER_NOT_FOUND,
      );
    }

    let finalContent: string;
    let smsTemplate: SmsTemplate | null = null;

    if (templateId) {
      smsTemplate = await this.smsTemplateRepository.findOne({
        where: { id: templateId /*, userId: userId */ },
      });
      if (!smsTemplate) {
        throw new BusinessException(
          `Template with ID ${templateId} not found or inactive`,
          BusinessErrorCode.TEMPLATE_NOT_FOUND,
        );
      }
      finalContent = this.substituteVariables(smsTemplate.content, variables);
      if (!finalContent) {
        throw new BadRequestException(
          'Template content is empty or substitution failed.',
        );
      }
    } else if (!content) {
      throw new BadRequestException(
        'Either content or templateId must be provided.',
      );
    } else {
      finalContent = content;
    }

    if (!finalContent) {
      throw new BadRequestException(
        'Message content cannot be empty after processing template.',
      );
    }

    // 创建批次记录，使用新的实体结构
    const newBatchData: Partial<SmsNotificationBatch> = {
      userId,
      // 使用可选的requestId，确保幂等性
      requestId: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      status: 'pending' as BatchStatus,
      templateId: templateId || null,
      content: finalContent, // 直接存储最终内容
      recipients, // JSON数组形式存储接收者
      recipientCount: recipients.length,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    };

    const newBatch = this.smsBatchRepository.create(newBatchData);

    const savedBatch: SmsNotificationBatch =
      await this.smsBatchRepository.save(newBatch);

    if (!savedBatch || !savedBatch.id) {
      this.logger.error(`Failed to save SMS batch for user ${userId}.`);
      throw new Error('Failed to save SMS batch.');
    }

    this.logger.log(
      `Created SMS batch ${savedBatch.id}, status: ${savedBatch.status}`,
    );

    // 为每个接收者创建消息记录
    for (const recipient of recipients) {
      const smsMessageData: Partial<SmsMessage> = {
        batchId: savedBatch.id,
        providerId: provider.id, // 设置服务商ID
        recipientNumber: recipient,
        status: 'queued' as SmsStatus,
      };

      const smsMessage = this.smsMessageRepository.create(smsMessageData);
      const savedSmsMessage = await this.smsMessageRepository.save(smsMessage);

      if (!savedSmsMessage || !savedSmsMessage.id) {
        this.logger.error(
          `Failed to save SMS message for batch ${savedBatch.id}, recipient ${recipient}.`,
        );
        continue;
      }

      // 添加到队列中处理
      const jobData: SmsSendJobData = {
        batchId: savedBatch.id,
        messageId: savedSmsMessage.id,
        provider: provider.id,
        recipient: recipient,
        content: finalContent,
      };

      const jobOptions = scheduledAt
        ? { delay: new Date(scheduledAt).getTime() - Date.now() }
        : {};

      await this.smsQueue.add(jobData, jobOptions);
      this.logger.debug(
        `Added SMS job for message ${savedSmsMessage.id} to queue`,
      );
    }

    return savedBatch;
  }

  async sendEmail(
    userId: number,
    sendEmailDto: SendEmailDto,
  ): Promise<EmailNotificationBatch> {
    this.logger.log(`Processing email send request for user ${userId}`);
    const { recipients, subject, body, templateId, variables, scheduledAt } =
      sendEmailDto;

    let emailTemplate: EmailTemplate | null = null;
    let finalSubject: string | null = subject || null;
    let finalBodyHtml: string | null = null;
    let finalBodyText: string | null = null;

    if (templateId) {
      emailTemplate = await this.emailTemplateRepository.findOne({
        where: { id: templateId },
      });
      if (!emailTemplate) {
        throw new BusinessException(
          `Template with ID ${templateId} not found or inactive`,
          BusinessErrorCode.TEMPLATE_NOT_FOUND,
        );
      }
      finalSubject =
        this.substituteVariables(emailTemplate.subject, variables) ||
        emailTemplate.subject;
      if (emailTemplate.bodyHtml) {
        finalBodyHtml = this.substituteVariables(
          emailTemplate.bodyHtml,
          variables,
        );
      }
      if (emailTemplate.bodyText) {
        finalBodyText = this.substituteVariables(
          emailTemplate.bodyText,
          variables,
        );
      }
    } else if (!subject || !body) {
      throw new BadRequestException(
        'Either templateId or (subject and body) must be provided.',
      );
    } else {
      finalBodyHtml = body;
    }

    if (!finalSubject) {
      throw new BadRequestException('Email subject cannot be empty.');
    }
    if (!finalBodyHtml && !finalBodyText) {
      throw new BadRequestException(
        'Email body is empty after processing template or input.',
      );
    }

    const newBatch = this.emailBatchRepository.create({
      userId,
      emailTemplateId: emailTemplate?.id,
      subject: templateId ? null : subject,
      bodyHtml: templateId ? null : body,
      bodyText: null,
      totalRecipients: recipients.length,
      status: EmailBatchStatus.PENDING,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    });
    const savedBatch = await this.emailBatchRepository.save(newBatch);
    this.logger.log(
      `Created email batch ${savedBatch.id}, status: ${savedBatch.status}`,
    );

    for (const recipient of recipients) {
      const emailMessage = this.emailMessageRepository.create({
        batchId: savedBatch.id,
        recipientEmail: recipient,
        status: 'queued',
      });
      const savedEmailMessage =
        await this.emailMessageRepository.save(emailMessage);

      const jobData: EmailSendJobData = {
        batchId: savedBatch.id,
        messageId: savedEmailMessage.id,
        recipient: recipient,
        subject: finalSubject,
        bodyHtml: finalBodyHtml,
        bodyText: finalBodyText,
      };

      const jobOptions = scheduledAt
        ? { delay: new Date(scheduledAt).getTime() - Date.now() }
        : {};

      await this.emailQueue.add(jobData, jobOptions);
      this.logger.debug(
        `Added email job for message ${savedEmailMessage.id} to queue`,
      );
    }

    return savedBatch;
  }

  private async callOnbukaApi(
    recipient: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.configService.get<string>(
      'SMS_PROVIDER_ONBUKA_API_KEY',
    );
    const apiSecret = this.configService.get<string>(
      'SMS_PROVIDER_ONBUKA_API_SECRET',
    );
    const baseUrl = this.configService.get<string>(
      'SMS_PROVIDER_ONBUKA_BASE_URL',
    );

    if (!apiKey || !apiSecret || !baseUrl) {
      this.logger.error('Onbuka API credentials or base URL not configured.');
      throw new Error('SMS provider configuration error.');
    }

    const url = `${baseUrl}/v1/sms/send`; // Fictional endpoint
    const payload = {
      apiKey: apiKey,
      apiSecret: apiSecret, // Or use Authorization header
      to: recipient,
      text: message,
    };
    const headers = {
      'Content-Type': 'application/json',
    };

    this.logger.debug(
      `Calling Onbuka API: URL=${url}, Payload=${JSON.stringify(payload)}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers }),
      );

      this.logger.debug(
        `Onbuka API response: ${JSON.stringify(response.data)}`,
      );

      const responseData = response.data as {
        success?: boolean;
        messageId?: string;
        message?: string;
      };
      if (responseData && responseData.success) {
        return { success: true, messageId: responseData.messageId };
      } else {
        throw new Error(responseData?.message || 'Onbuka API call failed');
      }
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object') {
        const axiosError = error as {
          response?: { data?: { message?: string } };
          message?: string;
          stack?: string;
        };
        errorMessage =
          axiosError.response?.data?.message ||
          (axiosError.message ? axiosError.message : errorMessage);
        this.logger.error(
          `Error calling Onbuka API for ${recipient}: ${errorMessage}`,
          axiosError.stack,
        );
      }
      return { success: false, error: `Onbuka API Error: ${errorMessage}` };
    }
  }

  private substituteVariables(
    template: string,
    variables?: Record<string, any>,
  ): string {
    if (!variables) {
      return template;
    }
    let substituted = template;
    for (const key in variables) {
      const regex = new RegExp(`{{[ ]*${key}[ ]*}}`, 'g');
      substituted = substituted.replace(regex, String(variables[key]));
    }
    return substituted;
  }

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
      await this.updateSmsMessageStatus(messageId, 'sending');

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

    await this.updateSmsMessageStatus(
      messageId,
      status,
      errorMessage,
      providerMessageId,
      sentAt,
    );
  }

  async updateSmsMessageStatus(
    messageId: number,
    status: SmsStatus,
    errorMessage?: string | null,
    providerMessageId?: string | null,
    sentAt?: Date | null,
  ): Promise<void> {
    this.logger.debug(
      `Updating status for SMS message ${messageId} to ${status}`,
    );
    try {
      await this.smsMessageRepository.update(
        { id: messageId },
        {
          status: status,
          errorMessage: errorMessage === undefined ? undefined : errorMessage,
          providerMessageId:
            providerMessageId === undefined ? undefined : providerMessageId,
          sentAt: sentAt === undefined ? undefined : sentAt,
          statusUpdatedAt: new Date(),
        },
      );
    } catch (error) {
      const dbErrorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update status for SMS message ${messageId}: ${dbErrorMessage}`,
      );
      throw error; // 重新抛出错误
    }
  }

  async isBatchProcessingComplete(batchId: number): Promise<boolean> {
    const incompleteMessagesCount = await this.smsMessageRepository.count({
      where: {
        batchId: batchId,
        status: Not(In(['sent', 'failed', 'delivered', 'rejected'])),
      },
    });
    return incompleteMessagesCount === 0;
  }

  async finalizeBatchStatus(batchId: number): Promise<SmsNotificationBatch> {
    const batch: SmsNotificationBatch | null =
      await this.smsBatchRepository.findOne({
        where: { id: batchId },
      });

    if (!batch) {
      this.logger.error(`尝试完成批次状态时未找到批次: ${batchId}`);
      throw new NotFoundException(
        `Batch with ID ${batchId} not found during finalization.`,
      );
    }

    if (
      [
        'completed',
        'failed' /*'partially_completed' - no enum value*/,
      ].includes(batch.status)
    ) {
      this.logger.warn(
        `批次 ${batchId} 状态已为 ${batch.status}，跳过最终状态更新。`,
      );
      return batch;
    }

    const messages = await this.smsMessageRepository.find({
      where: { batchId: batchId },
      select: ['status'],
    });

    const totalMessages = messages.length;
    const sentCount = messages.filter((m) =>
      ['sent', 'delivered'].includes(m.status),
    ).length;
    const failedCount = messages.filter((m) =>
      ['failed', 'rejected'].includes(m.status),
    ).length;
    const processedCount = sentCount + failedCount;

    let finalStatus: BatchStatus;
    if (
      failedCount === 0 &&
      sentCount > 0 &&
      processedCount === totalMessages
    ) {
      finalStatus = 'completed';
    } else if (
      sentCount > 0 &&
      failedCount > 0 &&
      processedCount === totalMessages
    ) {
      finalStatus = 'failed';
    } else if (
      failedCount > 0 &&
      sentCount === 0 &&
      processedCount === totalMessages
    ) {
      finalStatus = 'failed';
    } else if (processedCount < totalMessages) {
      this.logger.warn(
        `批次 ${batchId} 最终状态计算时发现未处理完的消息，状态维持 ${batch.status}`,
      );
      finalStatus = batch.status;
    } else {
      finalStatus = 'completed';
      this.logger.warn(
        `批次 ${batchId} 最终状态计算时成功和失败数均为0，默认为完成。`,
      );
    }

    batch.status = finalStatus;
    batch.processedCount = processedCount;
    batch.successCount = sentCount;
    batch.failureCount = failedCount;
    batch.processingCompletedAt = new Date();

    const updatedBatch: SmsNotificationBatch =
      await this.smsBatchRepository.save(batch);
    this.logger.log(`批次 ${batchId} 状态更新为: ${updatedBatch.status}`);
    return updatedBatch;
  }

  async sendSingleEmail(
    batchId: number,
    messageId: number,
    recipient: string,
    subject: string,
    bodyHtml?: string | null,
    bodyText?: string | null,
  ): Promise<void> {
    this.logger.debug(
      `Sending email for message ID: ${messageId} to ${recipient}`,
    );
    let status: EmailStatus = 'sending';
    let errorMessage: string | null = null;
    let providerMessageId: string | null = null;
    let sentAt: Date | null = null;

    try {
      await this.updateEmailMessageStatus(messageId, 'sending');

      const mailProvider = this.configService.get<string>('MAIL_PROVIDER');
      if (mailProvider === 'sendgrid') {
        providerMessageId = `fake-provider-id-${messageId}`;
        status = 'sent';
        sentAt = new Date();
        this.logger.log(
          `Email message ${messageId} sent successfully via ${mailProvider}`,
        );
      } else if (mailProvider === 'log') {
        this.logger.log(`--- MOCK EMAIL ---`);
        this.logger.log(`To: ${recipient}`);
        this.logger.log(`Subject: ${subject}`);
        if (bodyText) this.logger.log(`Text: ${bodyText.substring(0, 100)}...`);
        if (bodyHtml) this.logger.log(`HTML: ${bodyHtml.substring(0, 100)}...`);
        this.logger.log(`--- END MOCK EMAIL ---`);
        status = 'sent';
        sentAt = new Date();
      } else {
        throw new Error(`Unsupported mail provider: ${mailProvider}`);
      }
    } catch (error: unknown) {
      status = 'failed';
      errorMessage =
        error instanceof Error ? error.message : 'Unknown email sending error';
      this.logger.error(
        `Unhandled error sending email message ${messageId}: ${errorMessage}`,
        (error as Error)?.stack,
      );
    }

    await this.updateEmailMessageStatus(
      messageId,
      status,
      errorMessage,
      providerMessageId,
      sentAt,
    );
  }

  async updateEmailMessageStatus(
    messageId: number,
    status: EmailStatus,
    errorMessage?: string | null,
    providerMessageId?: string | null,
    sentAt?: Date | null,
  ): Promise<void> {
    this.logger.debug(
      `Updating status for email message ${messageId} to ${status}`,
    );
    try {
      await this.emailMessageRepository.update(
        { id: messageId },
        {
          status: status,
          errorMessage: errorMessage === undefined ? undefined : errorMessage,
          providerMessageId:
            providerMessageId === undefined ? undefined : providerMessageId,
          sentAt: sentAt === undefined ? undefined : (sentAt as Date),
          statusUpdatedAt: new Date(),
        },
      );
    } catch (error: unknown) {
      const dbErrorMessage =
        error instanceof Error ? error.message : 'Unknown DB error';
      this.logger.error(
        `Failed to update status for email message ${messageId}: ${dbErrorMessage}`,
      );
      throw error;
    }
  }
}
