import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  In,
  Not,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  Like,
} from 'typeorm';
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
import { SmsSendJobData } from '../notification/interfaces/sms-send-job-data.interface';
import { EmailSendJobData } from '../notification/interfaces/email-send-job-data.interface';
import { SendEmailDto } from '../notification/dto/send-email.dto';
import { EmailTemplate } from '../email-template/entities/email-template.entity';
import { SmsDispatcherService } from '../sms-dispatcher/sms-dispatcher.service';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';
import { SmsChannelConfigService } from '../sms-channel-config/sms-channel-config.service';
import { SmsBatchItemDto } from './dto/sms-batch-list.dto';
import {
  SmsBatchDetailDto,
  SmsMessageItemDto,
} from './dto/sms-batch-detail.dto';
import { QuerySmsBatchDto } from './dto/query-sms-batch.dto';

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
    private readonly smsChannelConfigService: SmsChannelConfigService,
  ) {}

  async sendSms(
    userId: number,
    sendSmsDto: SendSmsDto,
  ): Promise<SmsNotificationBatch> {
    this.logger.log(`Processing SMS send request for user ${userId}`);

    const {
      templateId,
      content,
      recipients,
      variables,
      providerId,
      countryCode,
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

    // 获取国家区号信息
    let dialCode = '';
    try {
      // 根据提供商名称查询支持的国家列表
      const supportedCountries =
        await this.smsChannelConfigService.getSupportedCountries('onbuka');

      // 查找指定国家代码的区号
      const countryInfo = supportedCountries.find(
        (country) => country.code === countryCode,
      );

      if (!countryInfo) {
        throw new BusinessException(
          `The country code ${countryCode} is not supported by provider ${provider.name}`,
          BusinessErrorCode.INVALID_COUNTRY_CODE,
        );
      }

      dialCode = countryInfo.dialCode;
      this.logger.debug(
        `Found dial code ${dialCode} for country ${countryCode}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Error getting dial code for country ${countryCode}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BusinessException(
        `Failed to get dial code for country ${countryCode}`,
        BusinessErrorCode.INVALID_COUNTRY_CODE,
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

    // 创建批次记录
    const newBatchData: Partial<SmsNotificationBatch> = {
      userId,
      name: `SMS Batch ${new Date().toISOString()}`,
      status: 'pending' as BatchStatus,
      contentType: templateId ? 'template' : 'direct',
      templateId: templateId || null,
      templateParams: variables || null,
      directContent: templateId ? undefined : finalContent,
      providerId,
      recipientNumbers: recipients.join(','),
      totalRecipients: recipients.length,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
    };

    const newBatch = this.smsBatchRepository.create(newBatchData);
    const savedBatch = await this.smsBatchRepository.save(newBatch);

    this.logger.log(
      `Created SMS batch ${savedBatch.id}, status: ${savedBatch.status}`,
    );

    // 为每个接收者创建消息记录，并拼接区号
    for (const recipient of recipients) {
      // 拼接区号和手机号，对于 Buka 服务商，不添加 + 号
      const formattedNumber = dialCode.startsWith('+')
        ? dialCode.substring(1) + recipient // 去掉 + 号
        : dialCode + recipient;

      const smsMessage = this.smsMessageRepository.create({
        batchId: savedBatch.id,
        recipientNumber: formattedNumber,
        status: 'queued',
        providerId,
      });

      const savedMessage = await this.smsMessageRepository.save(smsMessage);

      // 创建发送任务
      const jobData: SmsSendJobData = {
        batchId: savedBatch.id,
        messageId: savedMessage.id,
        provider: providerId,
        recipient: formattedNumber,
        content: finalContent,
      };

      await this.smsQueue.add(jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
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
    let sendTime: Date | null = null;

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

    await this.updateSmsMessageStatus(
      messageId,
      status,
      errorMessage,
      providerMessageId,
      sendTime,
    );
  }

  async updateSmsMessageStatus(
    messageId: number,
    status: SmsStatus,
    errorMessage?: string | null,
    providerMessageId?: string | null,
    sendTime?: Date | null,
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
          sendTime: sendTime === undefined ? undefined : sendTime,
          statusUpdateTime: new Date(),
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
    let sendTime: Date | null = null;

    try {
      await this.updateEmailMessageStatus(messageId, 'sending');

      const mailProvider = this.configService.get<string>('MAIL_PROVIDER');
      if (mailProvider === 'sendgrid') {
        providerMessageId = `fake-provider-id-${messageId}`;
        status = 'sent';
        sendTime = new Date();
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
        sendTime = new Date();
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
      sendTime,
    );
  }

  async updateEmailMessageStatus(
    messageId: number,
    status: EmailStatus,
    errorMessage?: string | null,
    providerMessageId?: string | null,
    sendTime?: Date | null,
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
          sendTime: sendTime === undefined ? undefined : (sendTime as Date),
          statusUpdateTime: new Date(),
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

  /**
   * 获取短信批次列表
   * @param userId 用户ID
   * @param queryDto 查询参数
   * @returns 分页结果对象 { list, total }
   */
  async getSmsBatchList(
    userId: number,
    queryDto: QuerySmsBatchDto,
  ): Promise<{ list: SmsBatchItemDto[]; total: number }> {
    const {
      status,
      pageNo = 1,
      pageSize = 10,
      createStartTime,
      createEndTime,
      batchId,
    } = queryDto;
    const skip = (pageNo - 1) * pageSize;

    const whereConditions: Record<string, any> = { userId };

    // Apply batchId filter only if it's a non-empty string
    if (batchId && batchId.trim() !== '') {
      whereConditions.id = Like(`%${batchId}%`);
    }

    // Apply status filter only if it's a non-empty string
    if (status && status.trim() !== '') {
      whereConditions.status = status;
    }

    if (createStartTime && createEndTime) {
      whereConditions.createTime = Between(
        new Date(createStartTime),
        new Date(createEndTime),
      );
    } else if (createStartTime) {
      whereConditions.createTime = MoreThanOrEqual(new Date(createStartTime));
    } else if (createEndTime) {
      whereConditions.createTime = LessThanOrEqual(new Date(createEndTime));
    }

    const [batches, total] = await this.smsBatchRepository.findAndCount({
      where: whereConditions,
      order: { createTime: 'DESC' },
      skip,
      take: pageSize,
    });

    const batchItems = batches.map((batch) => this.mapBatchToDto(batch));

    return {
      list: batchItems,
      total,
    };
  }

  /**
   * 获取短信批次详情
   * @param userId 用户ID
   * @param batchId 批次ID
   * @returns 批次详情
   */
  async getSmsBatchDetail(
    userId: number,
    batchId: number,
  ): Promise<SmsBatchDetailDto> {
    const batch = await this.smsBatchRepository.findOne({
      where: { id: batchId, userId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    const messages = await this.smsMessageRepository.find({
      where: { batchId },
      order: { createTime: 'ASC' },
    });

    const messageItems = messages.map((message) =>
      this.mapMessageToDto(message),
    );

    const batchDetail = this.mapBatchToDetailDto(batch);
    batchDetail.messages = messageItems;

    return batchDetail;
  }

  /**
   * 将批次对象映射为DTO
   * @param batch 批次对象
   * @returns 批次DTO
   */
  private mapBatchToDto(batch: SmsNotificationBatch): SmsBatchItemDto {
    return {
      id: batch.id,
      userId: batch.userId,
      name: batch.name,
      status: batch.status,
      contentType: batch.contentType ?? 'template',
      templateId: batch.templateId ?? null,
      totalRecipients: batch.totalRecipients,
      processedCount: batch.processedCount ?? 0,
      successCount: batch.successCount ?? 0,
      failureCount: batch.failureCount ?? 0,
      createTime: batch.createTime,
      updateTime: batch.updateTime,
    };
  }

  /**
   * 将批次对象映射为详情DTO
   * @param batch 批次对象
   * @returns 批次详情DTO
   */
  private mapBatchToDetailDto(batch: SmsNotificationBatch): SmsBatchDetailDto {
    return {
      ...this.mapBatchToDto(batch),
      directContent: batch.directContent || null,
      templateParams: batch.templateParams || null,
      providerId: batch.providerId,
      recipientNumbers: batch.recipientNumbers,
      messages: [],
    };
  }

  /**
   * 将消息对象映射为DTO
   * @param message 消息对象
   * @returns 消息DTO
   */
  private mapMessageToDto(message: SmsMessage): SmsMessageItemDto {
    return {
      id: message.id,
      batchId: message.batchId,
      recipientNumber: message.recipientNumber,
      status: message.status,
      providerMessageId: message.providerMessageId,
      errorMessage: message.errorMessage,
      sendTime: message.sendTime,
      statusUpdateTime: message.statusUpdateTime,
      createTime: message.createTime,
      updateTime: message.updateTime,
    };
  }

  /**
   * 刷新批次状态
   * @param userId 用户ID
   * @param batchId 批次ID
   * @returns 更新后的批次详情
   */
  async refreshBatchStatus(
    userId: number,
    batchId: number,
  ): Promise<SmsBatchDetailDto> {
    // 获取批次信息
    const batch = await this.smsBatchRepository.findOne({
      where: { id: batchId, userId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // 获取批次消息
    const messages = await this.smsMessageRepository.find({
      where: { batchId },
    });

    let bukaDataUpdated = false;

    // 尝试从Buka获取最新状态
    try {
      // 为每条消息查询状态并记录结果
      let bukaSuccess = 0;
      let bukaFail = 0;

      this.logger.log(`开始查询批次${batchId}的消息状态`);

      // 遍历所有消息，查询其状态
      for (const message of messages) {
        if (message.providerMessageId) {
          try {
            // 使用短信分发服务查询消息状态
            const statusResult =
              await this.smsDispatcherService.queryMessageStatus(
                message.id,
                batch.providerId,
                message.providerMessageId,
                batchId, // 传递批次ID
              );

            if (statusResult.success) {
              // 更新消息状态
              await this.smsMessageRepository.update(message.id, {
                status: statusResult.status as SmsStatus,
                statusUpdateTime: statusResult.statusUpdateTime || new Date(),
                errorMessage: statusResult.errorMessage || null,
              });

              // 根据状态更新计数
              if (
                statusResult.status === 'delivered' ||
                statusResult.status === 'sent'
              ) {
                bukaSuccess++;
              } else if (
                statusResult.status === 'failed' ||
                statusResult.status === 'rejected'
              ) {
                bukaFail++;
              }

              this.logger.debug(
                `已更新消息 ${message.id} 状态为 ${statusResult.status}`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Error querying message status for message ${message.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      // 记录从Buka更新统计到的数量
      this.logger.log(
        `从Buka状态查询统计 - 成功: ${bukaSuccess}, 失败: ${bukaFail}`,
      );

      // 只有当我们确实获取到了一些有效数据时，才更新批次状态
      if (bukaSuccess > 0 || bukaFail > 0) {
        // 强制更新批次计数和状态
        let newStatus = batch.status; // 默认保持原状态

        // 根据计数确定新状态
        if (bukaFail > 0) {
          newStatus = 'failed';
        } else if (bukaSuccess > 0) {
          newStatus = 'completed';
        }

        // 强制更新批次统计，无论当前状态如何
        await this.smsBatchRepository.update(batchId, {
          successCount: bukaSuccess,
          failureCount: bukaFail,
          processedCount: bukaSuccess + bukaFail,
          status: newStatus,
          processingCompletedAt: new Date(),
        });

        this.logger.log(
          `已强制更新批次 ${batchId} - 成功: ${bukaSuccess}, 失败: ${bukaFail}, 状态: ${newStatus}`,
        );
        bukaDataUpdated = true;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`刷新批次 ${batchId} 状态时出错: ${errorMsg}`);
      // 发生错误时，将使用数据库中的现有数据
    }

    // 如果Buka数据更新失败，尝试使用finalizeBatchStatus更新批次状态
    if (!bukaDataUpdated) {
      this.logger.log(
        `Buka数据更新失败或无数据，尝试从数据库更新批次 ${batchId} 状态`,
      );
      try {
        await this.finalizeBatchStatus(batchId);
      } catch (error) {
        this.logger.warn(
          `finalizeBatchStatus更新失败: ${error instanceof Error ? error.message : String(error)}`,
        );
        // 即使finalizeBatchStatus失败，也继续执行并返回当前数据
      }
    }

    // 返回更新后的批次详情
    return this.getSmsBatchDetail(userId, batchId);
  }
}
