import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { SmsNotificationBatch } from '../sms-notification-batch/entities/sms-notification-batch.entity';
import { EmailNotificationBatch } from '../email-notification-batch/entities/email-notification-batch.entity';
import { SmsMessage } from '../sms-message/entities/sms-message.entity';
import { EmailMessage } from '../email-message/entities/email-message.entity';
import { SmsReceivedMessage } from '../sms-received-message/entities/sms-received-message.entity';
import { User, UserRole } from '../user/entities/user.entity';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';
import { BatchMessagesFilterDto } from './dto/get-batch-messages.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { SmsMessagePageReqDto } from './dto/sms-message-page.dto';
import { SmsReceivedMessagePageReqDto } from './dto/sms-received-message-page.dto';
import { EmailReceivedMessage } from '../email-received-message/entities/email-received-message.entity';
import { EmailReceivedMessagePageReqDto } from './dto/email-received-message-page.dto';
import { SmsMessageResponseDto } from '../sms/dto/sms-service-response.dto';
import { SmsMessageStatus } from './dto/sms-message-page.dto';

@Injectable()
export class StatusService {
  private readonly logger = new Logger(StatusService.name);

  constructor(
    @InjectRepository(SmsNotificationBatch)
    private readonly smsBatchRepository: Repository<SmsNotificationBatch>,
    @InjectRepository(EmailNotificationBatch)
    private readonly emailBatchRepository: Repository<EmailNotificationBatch>,
    @InjectRepository(SmsMessage)
    private readonly smsMessageRepository: Repository<SmsMessage>,
    @InjectRepository(EmailMessage)
    private readonly emailMessageRepository: Repository<EmailMessage>,
    @InjectRepository(SmsReceivedMessage)
    private readonly smsReceivedMessageRepository: Repository<SmsReceivedMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmailReceivedMessage)
    private readonly emailReceivedMessageRepository: Repository<EmailReceivedMessage>,
  ) {}

  // --- SMS Status ---

  async getSmsBatchStatus(
    userId: number,
    batchId: number,
  ): Promise<SmsNotificationBatch> {
    this.logger.log(
      `User ${userId} requesting status for SMS batch ${batchId}`,
    );
    const batch = await this.smsBatchRepository.findOne({
      where: { id: batchId, userId: userId },
      // Optionally load related messages if needed, but can be heavy
      // relations: ['smsMessages']
    });

    if (!batch) {
      throw new BusinessException(
        `SMS batch with ID ${batchId} not found`,
        BusinessErrorCode.SMS_BATCH_NOT_FOUND,
      );
    }
    return batch; // Return the full batch object (includes status and counts)
  }

  async getSmsMessageStatus(
    userId: number,
    messageId: number,
  ): Promise<SmsMessage> {
    this.logger.log(
      `User ${userId} requesting status for SMS message ${messageId}`,
    );
    // Need to ensure the message belongs to a batch owned by the user.
    // This requires a join or a two-step query.
    const message = await this.smsMessageRepository
      .createQueryBuilder('smsMessage')
      .innerJoin('smsMessage.batch', 'batch')
      .where('smsMessage.id = :messageId', { messageId })
      .andWhere('batch.userId = :userId', { userId })
      .select([
        // Select only necessary fields from message and optionally batch
        'smsMessage.id',
        'smsMessage.recipientNumber',
        'smsMessage.status',
        'smsMessage.providerMessageId',
        'smsMessage.errorMessage',
        'smsMessage.sendTime',
        'smsMessage.statusUpdateTime',
        'batch.id', // Include batch id for context
      ])
      .getOne();

    if (!message) {
      throw new BusinessException(
        `SMS message with ID ${messageId} not found`,
        BusinessErrorCode.SMS_MESSAGE_NOT_FOUND,
      );
    }
    return message;
  }

  /**
   * 获取批次中的消息，支持分页和过滤
   * @param userId 用户ID
   * @param batchId 批次ID
   * @param filter 过滤和分页条件
   * @returns 分页结果
   */
  async getSmsBatchMessages(
    userId: number,
    batchId: number,
    filter: BatchMessagesFilterDto,
  ): Promise<PaginatedResponseDto<SmsMessage>> {
    // 先确认批次存在且属于该用户
    const batch = await this.smsBatchRepository.findOne({
      where: { id: batchId, userId },
    });

    if (!batch) {
      throw new BusinessException(
        `SMS batch with ID ${batchId} not found`,
        BusinessErrorCode.SMS_BATCH_NOT_FOUND,
      );
    }

    // 构建查询构建器
    const queryBuilder = this.smsMessageRepository
      .createQueryBuilder('message')
      .where('message.batchId = :batchId', { batchId });

    // 应用过滤条件
    if (filter.status) {
      queryBuilder.andWhere('message.status = :status', {
        status: filter.status,
      });
    }

    if (filter.recipient) {
      queryBuilder.andWhere('message.recipientNumber LIKE :recipient', {
        recipient: `%${filter.recipient}%`,
      });
    }

    // 应用排序
    const sortBy = filter.sortBy || 'id';
    const sortOrder = filter.sortOrder || 'DESC';
    queryBuilder.orderBy(`message.${sortBy}`, sortOrder);

    // 应用分页
    const total = await queryBuilder.getCount();
    queryBuilder.skip(filter.skip).take(filter.limit);

    // 执行查询
    const items = await queryBuilder.getMany();

    // 构建分页响应
    return new PaginatedResponseDto(items, total, filter);
  }

  /**
   * 分页查询短信发送记录，支持基于角色的数据权限控制
   * @param userId 用户ID
   * @param query 查询条件
   * @returns 分页结果
   */
  async getAllSmsMessages(
    userId: number,
    query: SmsMessagePageReqDto,
  ): Promise<PaginatedResponseDto<SmsMessageResponseDto>> {
    // 查询当前用户角色
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'tenantId'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    this.logger.log(
      `User ${userId} querying SMS messages with filter: ${JSON.stringify(
        query,
      )}`,
    );

    // 构建查询构建器
    const queryBuilder = this.smsMessageRepository
      .createQueryBuilder('message')
      .leftJoin('message.batch', 'batch')
      .leftJoin('batch.user', 'batchUser')
      .leftJoin('batch.template', 'template')
      .select([
        'message.id',
        'message.recipientNumber',
        'message.status',
        'message.providerMessageId',
        'message.errorMessage',
        'message.sendTime',
        'message.statusUpdateTime',
        'batch.id',
        'batch.directContent',
        'batch.contentType',
        'batch.templateId',
        'batch.templateParams',
        'template.id',
        'template.name',
      ]);

    // 根据用户角色添加租户过滤条件
    if (user.role === UserRole.ADMIN) {
      if (query.tenantId) {
        queryBuilder.andWhere('batchUser.tenantId = :tenantId', {
          tenantId: query.tenantId,
        });
      }
    } else {
      // 非管理员只能查看自己租户的消息且只能查看自己的消息
      if (!user.tenantId) {
        throw new BusinessException(
          'User has no associated tenant',
          BusinessErrorCode.USER_NO_TENANT,
        );
      }
      queryBuilder.andWhere('batchUser.tenantId = :tenantId', {
        tenantId: user.tenantId,
      });
      // 添加用户ID过滤，确保只能看到自己发送的消息
      queryBuilder.andWhere('batch.userId = :userId', {
        userId: userId,
      });
    }

    // 添加其他过滤条件
    if (query.status && query.status !== SmsMessageStatus.ALL) {
      queryBuilder.andWhere('message.status = :status', {
        status: query.status,
      });
    }

    if (query.recipientNumber) {
      queryBuilder.andWhere('message.recipientNumber LIKE :recipientNumber', {
        recipientNumber: `%${query.recipientNumber}%`,
      });
    }

    if (query.batchId) {
      queryBuilder.andWhere('batch.id = :batchId', {
        batchId: query.batchId,
      });
    }

    if (query.sendTimeStart) {
      queryBuilder.andWhere('message.sendTime >= :sendTimeStart', {
        sendTimeStart: query.sendTimeStart,
      });
    }

    if (query.sendTimeEnd) {
      queryBuilder.andWhere('message.sendTime <= :sendTimeEnd', {
        sendTimeEnd: query.sendTimeEnd,
      });
    }

    // 应用排序
    queryBuilder.orderBy('message.id', 'DESC');

    // 应用分页
    const [items, total] = await queryBuilder
      .skip((query.pageNo - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    // 将实体转换为DTO
    const dtos = items.map((message) => {
      const dto = new SmsMessageResponseDto();
      dto.id = message.id;
      dto.recipientNumber = message.recipientNumber;
      dto.status = message.status;
      dto.providerMessageId = message.providerMessageId || undefined;
      dto.errorMessage = message.errorMessage || undefined;
      dto.sendTime = message.sendTime || undefined;
      dto.statusUpdateTime = message.statusUpdateTime || undefined;

      if (message.batch) {
        dto.batchId = message.batch.id;
        dto.directContent = message.batch.directContent || undefined;
        dto.contentType = message.batch.contentType || undefined;
        dto.templateId = message.batch.templateId || undefined;
        dto.templateParams = message.batch.templateParams || undefined;
        if (message.batch.template) {
          dto.templateName = message.batch.template.name;
        }
      }

      return dto;
    });

    return new PaginatedResponseDto(dtos, total, query);
  }

  /**
   * 分页查询短信接收记录，支持基于角色的数据权限控制
   * @param userId 用户ID
   * @param query 查询条件
   * @returns 分页结果
   */
  async getSmsReceivedMessages(
    userId: number,
    query: SmsReceivedMessagePageReqDto,
  ): Promise<PaginatedResponseDto<SmsReceivedMessage>> {
    // 查询当前用户角色
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'tenantId'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    this.logger.log(
      `User ${userId} querying SMS received messages with filter: ${JSON.stringify(
        query,
      )}`,
    );

    // 构建查询条件
    const whereConditions: FindOptionsWhere<SmsReceivedMessage> = {};

    if (query.senderNumber) {
      whereConditions.senderNumber = Like(`%${query.senderNumber}%`);
    }

    if (query.recipientNumber) {
      whereConditions.recipientNumber = Like(`%${query.recipientNumber}%`);
    }

    if (query.content) {
      whereConditions.content = Like(`%${query.content}%`);
    }

    // 基于用户角色和租户ID进行数据访问控制
    if (user.role === UserRole.ADMIN) {
      this.logger.log(
        `Admin user ${userId} querying SMS received messages${
          query.tenantId ? ` for tenant ${query.tenantId}` : ' for all tenants'
        }`,
      );
      // 管理员可以查看所有记录，或按指定租户筛选
      if (query.tenantId) {
        whereConditions.tenantId = query.tenantId;
      }
    } else {
      // 非管理员用户只能查看自己租户的记录
      whereConditions.tenantId = user.tenantId as number;
      this.logger.log(
        `Regular user ${userId} (tenant ${user.tenantId}) querying received messages`,
      );
    }

    // 执行查询
    const [items, total] = await this.smsReceivedMessageRepository.findAndCount(
      {
        where: whereConditions,
        skip: query.skip,
        take: query.limit,
        order: { receivedAt: 'DESC' },
      },
    );

    // 返回分页结果
    return new PaginatedResponseDto(items, total, query);
  }

  // --- Email Status ---

  async getEmailBatchStatus(
    userId: number,
    batchId: number,
  ): Promise<EmailNotificationBatch> {
    this.logger.log(
      `User ${userId} requesting status for Email batch ${batchId}`,
    );
    const batch = await this.emailBatchRepository.findOne({
      where: { id: batchId, userId: userId },
    });

    if (!batch) {
      throw new BusinessException(
        `Email batch with ID ${batchId} not found`,
        BusinessErrorCode.EMAIL_BATCH_NOT_FOUND,
      );
    }
    return batch;
  }

  async getEmailMessageStatus(
    userId: number,
    messageId: number,
  ): Promise<EmailMessage> {
    this.logger.log(
      `User ${userId} requesting status for Email message ${messageId}`,
    );
    const message = await this.emailMessageRepository
      .createQueryBuilder('emailMessage')
      .innerJoin('emailMessage.batch', 'batch')
      .where('emailMessage.id = :messageId', { messageId })
      .andWhere('batch.userId = :userId', { userId })
      .select([
        'emailMessage.id',
        'emailMessage.recipientEmail',
        'emailMessage.status',
        'emailMessage.providerMessageId',
        'emailMessage.errorMessage',
        'emailMessage.sendTime',
        'emailMessage.statusUpdateTime',
        'batch.id',
      ])
      .getOne();

    if (!message) {
      throw new BusinessException(
        `Email message with ID ${messageId} not found`,
        BusinessErrorCode.EMAIL_MESSAGE_NOT_FOUND,
      );
    }
    return message;
  }

  /**
   * 获取批次中的邮件消息，支持分页和过滤
   * @param userId 用户ID
   * @param batchId 批次ID
   * @param filter 过滤和分页条件
   * @returns 分页结果
   */
  async getEmailBatchMessages(
    userId: number,
    batchId: number,
    filter: BatchMessagesFilterDto,
  ): Promise<PaginatedResponseDto<EmailMessage>> {
    // 先确认批次存在且属于该用户
    const batch = await this.emailBatchRepository.findOne({
      where: { id: batchId, userId },
    });

    if (!batch) {
      throw new BusinessException(
        `Email batch with ID ${batchId} not found`,
        BusinessErrorCode.EMAIL_BATCH_NOT_FOUND,
      );
    }

    // 构建查询构建器
    const queryBuilder = this.emailMessageRepository
      .createQueryBuilder('message')
      .where('message.batchId = :batchId', { batchId });

    // 应用过滤条件
    if (filter.status) {
      queryBuilder.andWhere('message.status = :status', {
        status: filter.status,
      });
    }

    if (filter.recipient) {
      queryBuilder.andWhere('message.recipientEmail LIKE :recipient', {
        recipient: `%${filter.recipient}%`,
      });
    }

    // 应用排序
    const sortBy = filter.sortBy || 'id';
    const sortOrder = filter.sortOrder || 'DESC';
    queryBuilder.orderBy(`message.${sortBy}`, sortOrder);

    // 应用分页
    const total = await queryBuilder.getCount();
    queryBuilder.skip(filter.skip).take(filter.limit);

    // 执行查询
    const items = await queryBuilder.getMany();

    // 构建分页响应
    return new PaginatedResponseDto(items, total, filter);
  }

  /**
   * 分页查询邮件接收记录，支持基于角色的数据权限控制
   * @param userId 用户ID
   * @param query 查询条件
   * @returns 分页结果
   */
  async getEmailReceivedMessages(
    userId: number,
    query: EmailReceivedMessagePageReqDto,
  ): Promise<PaginatedResponseDto<EmailReceivedMessage>> {
    // 查询当前用户角色
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'tenantId'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    this.logger.log(
      `User ${userId} querying email received messages with filter: ${JSON.stringify(
        query,
      )}`,
    );

    // 构建查询条件
    const whereConditions: FindOptionsWhere<EmailReceivedMessage> = {};

    if (query.senderEmail) {
      whereConditions.senderEmail = Like(`%${query.senderEmail}%`);
    }

    if (query.recipientEmail) {
      whereConditions.recipientEmail = Like(`%${query.recipientEmail}%`);
    }

    if (query.subject) {
      whereConditions.subject = Like(`%${query.subject}%`);
    }

    if (query.type) {
      whereConditions.type = query.type;
    }

    // 基于用户角色和租户ID进行数据访问控制
    if (user.role === UserRole.ADMIN) {
      this.logger.log(
        `Admin user ${userId} querying email received messages${
          query.tenantId ? ` for tenant ${query.tenantId}` : ' for all tenants'
        }`,
      );
      // 管理员可以查看所有记录，或按指定租户筛选
      if (query.tenantId) {
        whereConditions.tenantId = query.tenantId;
      }
    } else {
      // 非管理员用户只能查看自己租户的记录
      whereConditions.tenantId = user.tenantId as number;
      this.logger.log(
        `Regular user ${userId} (tenant ${user.tenantId}) querying email received messages`,
      );
    }

    // 执行查询，按接收时间倒序排序
    const [items, total] =
      await this.emailReceivedMessageRepository.findAndCount({
        where: whereConditions,
        skip: query.skip,
        take: query.limit,
        order: { receivedAt: 'DESC' },
      });

    // 返回分页结果
    return new PaginatedResponseDto(items, total, query);
  }
}
