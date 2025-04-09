import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  FindOptionsWhere,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { SmsTemplate } from './entities/sms-template.entity';
import { EmailTemplate } from '../email-template/entities/email-template.entity';
import { CreateSmsTemplateDto } from './dto/create-sms-template.dto';
import { UpdateSmsTemplateDto } from './dto/update-sms-template.dto';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { SmsTemplatePageDto } from './dto/sms-template-page.dto';
import { QuerySmsTemplatePageDto } from './dto/query-sms-template-page.dto';
import { QueryEmailTemplatePageDto } from './dto/query-email-template-page.dto';
import { EmailTemplatePageDto } from './dto/email-template-page.dto';
import { SmsTemplateResponseDto } from './dto/sms-template-response.dto';
import { EmailTemplateResponseDto } from '../email-template/dto/email-template-response.dto';
import { User } from '../user/entities/user.entity';
import { UserDto } from '../user/dto';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly MAX_TEMPLATES_PER_TENANT = 10;

  constructor(
    @InjectRepository(SmsTemplate)
    private readonly smsTemplateRepository: Repository<SmsTemplate>,
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private transformUserToDto(
    user: User | null | undefined,
  ): UserDto | undefined {
    if (!user) {
      return undefined;
    }

    const userDto = new UserDto();
    userDto.id = user.id;
    userDto.username = user.username;
    userDto.email = user.email ?? null;
    userDto.role = user.role;
    userDto.isActive = user.isActive;
    userDto.tenantId = user.tenantId;
    userDto.tenant = user.tenant;
    userDto.createTime = user.createTime;
    userDto.updateTime = user.updateTime;
    return userDto;
  }

  // --- SMSe Methods ---

  async createSmsTemplate(
    userId: number,
    tenantId: number | undefined,
    createSmsTemplateDto: CreateSmsTemplateDto,
  ): Promise<SmsTemplate> {
    // 如果没有传入租户ID，则从用户信息获取
    if (!tenantId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'tenantId'],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      if (!user.tenantId) {
        throw new BusinessException(
          'User is not associated with any tenant',
          BusinessErrorCode.USER_NO_TENANT,
        );
      }

      tenantId = user.tenantId;
    }

    // 检查租户的模板数量是否已达到上限
    const existingTemplatesCount = await this.smsTemplateRepository.count({
      where: { tenantId },
    });

    if (existingTemplatesCount >= this.MAX_TEMPLATES_PER_TENANT) {
      throw new BusinessException(
        `Tenant has reached the maximum limit of ${this.MAX_TEMPLATES_PER_TENANT} templates`,
        BusinessErrorCode.TEMPLATE_LIMIT_EXCEEDED,
      );
    }

    // 检查用户是否属于该租户
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'tenantId',
        'username',
        'email',
        'role',
        'isActive',
        'createTime',
        'updateTime',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.tenantId !== tenantId) {
      throw new BusinessException(
        `User ${userId} does not belong to tenant ${tenantId}`,
        BusinessErrorCode.USER_NO_TENANT,
      );
    }

    // 创建新模板
    const newTemplate = this.smsTemplateRepository.create({
      ...createSmsTemplateDto,
      userId,
      tenantId,
      user,
    });

    this.logger.log(
      `User ${userId} creating SMS template: ${newTemplate.name} for tenant ${tenantId}`,
    );

    // 保存并返回完整的模板信息
    const savedTemplate = await this.smsTemplateRepository.save(newTemplate);
    const template = await this.smsTemplateRepository.findOne({
      where: { id: savedTemplate.id },
      relations: ['user', 'user.tenant'],
    });

    if (!template) {
      throw new NotFoundException(
        `Failed to retrieve saved template with ID ${savedTemplate.id}`,
      );
    }

    return template;
  }

  async findAllSmsTemplates(userId: number): Promise<SmsTemplate[]> {
    // 查询用户信息以获取租户ID
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId'],
    });

    if (!user || !user.tenantId) {
      throw new BusinessException(
        'User is not associated with any tenant',
        BusinessErrorCode.USER_NO_TENANT,
      );
    }

    // 返回该租户下的所有模板
    return this.smsTemplateRepository.find({
      where: { tenantId: user.tenantId },
      relations: ['user', 'user.tenant'],
      order: { createTime: 'DESC' },
    });
  }

  /**
   * 根据租户ID查询所有短信模板
   */
  async findAllSmsTemplatesByTenant(tenantId: number): Promise<SmsTemplate[]> {
    if (!tenantId) {
      throw new BusinessException(
        'Tenant ID is required',
        BusinessErrorCode.MISSING_REQUIRED_PARAMS,
      );
    }

    return this.smsTemplateRepository.find({
      where: { tenantId },
      relations: ['user', 'user.tenant'],
      order: { createTime: 'DESC' },
    });
  }

  async findOneSmsTemplate(userId: number, id: number): Promise<SmsTemplate> {
    const template = await this.smsTemplateRepository.findOne({
      where: { id, userId },
      relations: ['user', 'user.tenant'],
    });
    if (!template) {
      throw new NotFoundException(
        `SMS Template with ID ${id} not found for user ${userId}`,
      );
    }
    return template;
  }

  /**
   * 根据租户ID和模板ID查询单个短信模板
   */
  async findOneSmsTemplateByTenant(
    tenantId: number,
    id: number,
  ): Promise<SmsTemplate> {
    if (!tenantId) {
      throw new BusinessException(
        'Tenant ID is required',
        BusinessErrorCode.MISSING_REQUIRED_PARAMS,
      );
    }

    const template = await this.smsTemplateRepository.findOne({
      where: { id, tenantId },
      relations: ['user', 'user.tenant'],
    });

    if (!template) {
      throw new NotFoundException(
        `SMS Template with ID ${id} not found for tenant ${tenantId}`,
      );
    }

    return template;
  }

  async updateSmsTemplate(
    userId: number,
    id: number,
    updateSmsTemplateDto: UpdateSmsTemplateDto,
  ): Promise<SmsTemplate> {
    const template = await this.findOneSmsTemplate(userId, id); // Ensures template exists and belongs to user
    // Merge changes. createSmsTemplateDto should not contain userId.
    Object.assign(template, updateSmsTemplateDto);
    this.logger.log(`User ${userId} updating SMS template ID: ${id}`);
    return this.smsTemplateRepository.save(template);
  }

  /**
   * 根据租户ID和模板ID更新短信模板
   */
  async updateSmsTemplateByTenant(
    tenantId: number,
    id: number,
    updateSmsTemplateDto: UpdateSmsTemplateDto,
  ): Promise<SmsTemplate> {
    const template = await this.findOneSmsTemplateByTenant(tenantId, id);
    Object.assign(template, updateSmsTemplateDto);
    this.logger.log(`Updating SMS template ID ${id} for tenant ${tenantId}`);
    return this.smsTemplateRepository.save(template);
  }

  async removeSmsTemplate(userId: number, id: number): Promise<void> {
    const result = await this.smsTemplateRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `SMS Template with ID ${id} not found for user ${userId}`,
      );
    }
    this.logger.log(`User ${userId} removed SMS template ID: ${id}`);
  }

  /**
   * 根据租户ID和模板ID删除短信模板
   */
  async removeSmsTemplateByTenant(tenantId: number, id: number): Promise<void> {
    const result = await this.smsTemplateRepository.delete({ id, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `SMS Template with ID ${id} not found for tenant ${tenantId}`,
      );
    }
    this.logger.log(`Deleted SMS template ID: ${id} for tenant ${tenantId}`);
  }

  /**
   * 根据租户ID分页查询短信模板
   */
  async getSmsTemplatePage(
    tenantId: number,
    queryDto: QuerySmsTemplatePageDto,
  ): Promise<SmsTemplatePageDto> {
    const {
      pageNo = 1,
      pageSize = 10,
      name,
      createStartTime,
      createEndTime,
    } = queryDto;
    const skip = (pageNo - 1) * pageSize;

    if (!tenantId) {
      throw new BusinessException(
        'Tenant ID is required',
        BusinessErrorCode.MISSING_REQUIRED_PARAMS,
      );
    }

    // 构建查询条件
    const whereConditions: FindOptionsWhere<SmsTemplate> = { tenantId };
    if (name) {
      whereConditions.name = Like(`%${name}%`);
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

    // 执行查询
    const [templates, total] = await this.smsTemplateRepository.findAndCount({
      where: whereConditions,
      order: { createTime: 'DESC' },
      skip,
      take: pageSize,
      relations: ['user'],
    });

    // Map SmsTemplate[] to SmsTemplateResponseDto[]
    const responseList = templates.map((template: SmsTemplate) => {
      const dto = new SmsTemplateResponseDto();
      dto.id = template.id;
      dto.userId = template.userId;
      dto.tenantId = template.tenantId;
      dto.name = template.name;
      dto.content = template.content;
      dto.providerTemplateId = template.providerTemplateId;
      dto.variables = template.variables;
      dto.createTime = template.createTime;
      dto.updateTime = template.updateTime;
      dto.user = template.user
        ? this.transformUserToDto(template.user)
        : undefined;
      return dto;
    });

    return {
      list: responseList,
      total,
    };
  }

  // --- Email Template Methods ---

  async createEmailTemplate(
    userId: number,
    tenantId: number | undefined,
    createEmailTemplateDto: CreateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    if (!createEmailTemplateDto.bodyHtml && !createEmailTemplateDto.bodyText) {
      throw new ForbiddenException(
        'Either bodyHtml or bodyText must be provided.',
      );
    }

    // 如果没有传入租户ID，则从用户信息获取
    if (!tenantId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'tenantId'],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      tenantId = user.tenantId ?? undefined;
    }

    const newTemplate = this.emailTemplateRepository.create({
      ...createEmailTemplateDto,
      userId,
      tenantId, // 自动关联到指定租户
    });
    this.logger.log(
      `User ${userId} creating Email template: ${newTemplate.name} for tenant ${tenantId}`,
    );
    return this.emailTemplateRepository.save(newTemplate);
  }

  async findAllEmailTemplates(userId: number): Promise<EmailTemplate[]> {
    return this.emailTemplateRepository.find({ where: { userId } });
  }

  /**
   * 根据租户ID查询所有邮件模板
   */
  async findAllEmailTemplatesByTenant(
    tenantId: number,
  ): Promise<EmailTemplate[]> {
    if (!tenantId) {
      throw new BusinessException(
        'Tenant ID is required',
        BusinessErrorCode.MISSING_REQUIRED_PARAMS,
      );
    }

    return this.emailTemplateRepository.find({
      where: { tenantId },
      relations: ['user', 'user.tenant'],
      order: { createTime: 'DESC' },
    });
  }

  async findOneEmailTemplate(
    userId: number,
    id: number,
  ): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({
      where: { id, userId },
    });
    if (!template) {
      throw new NotFoundException(
        `Email Template with ID ${id} not found for user ${userId}`,
      );
    }
    return template;
  }

  /**
   * 根据租户ID和模板ID查询单个邮件模板
   */
  async findOneEmailTemplateByTenant(
    tenantId: number,
    id: number,
  ): Promise<EmailTemplate> {
    if (!tenantId) {
      throw new BusinessException(
        'Tenant ID is required',
        BusinessErrorCode.MISSING_REQUIRED_PARAMS,
      );
    }

    const template = await this.emailTemplateRepository.findOne({
      where: { id, tenantId },
      relations: ['user', 'user.tenant'],
    });

    if (!template) {
      throw new NotFoundException(
        `Email Template with ID ${id} not found for tenant ${tenantId}`,
      );
    }

    return template;
  }

  async updateEmailTemplate(
    userId: number,
    id: number,
    updateEmailTemplateDto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    const template = await this.findOneEmailTemplate(userId, id);
    Object.assign(template, updateEmailTemplateDto);
    // Ensure at least one body type exists after update if partial update clears one
    if (!template.bodyHtml && !template.bodyText) {
      throw new ForbiddenException(
        'After update, either bodyHtml or bodyText must be present.',
      );
    }
    this.logger.log(`User ${userId} updating Email template ID: ${id}`);
    return this.emailTemplateRepository.save(template);
  }

  /**
   * 根据租户ID和模板ID更新邮件模板
   */
  async updateEmailTemplateByTenant(
    tenantId: number,
    id: number,
    updateEmailTemplateDto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    const template = await this.findOneEmailTemplateByTenant(tenantId, id);
    Object.assign(template, updateEmailTemplateDto);

    // 确保至少有一种内容类型存在
    if (!template.bodyHtml && !template.bodyText) {
      throw new ForbiddenException(
        'After update, either bodyHtml or bodyText must be present.',
      );
    }

    this.logger.log(`Updating Email template ID ${id} for tenant ${tenantId}`);
    return this.emailTemplateRepository.save(template);
  }

  async removeEmailTemplate(userId: number, id: number): Promise<void> {
    const result = await this.emailTemplateRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Email Template with ID ${id} not found for user ${userId}`,
      );
    }
    this.logger.log(`User ${userId} removed Email template ID: ${id}`);
  }

  /**
   * 根据租户ID和模板ID删除邮件模板
   */
  async removeEmailTemplateByTenant(
    tenantId: number,
    id: number,
  ): Promise<void> {
    const result = await this.emailTemplateRepository.delete({ id, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Email Template with ID ${id} not found for tenant ${tenantId}`,
      );
    }
    this.logger.log(`Deleted Email template ID: ${id} for tenant ${tenantId}`);
  }

  /**
   * 根据租户ID分页查询邮件模板
   */
  async getEmailTemplatePage(
    tenantId: number,
    queryDto: QueryEmailTemplatePageDto,
  ): Promise<EmailTemplatePageDto> {
    const {
      pageNo = 1,
      pageSize = 10,
      name,
      subject,
      createStartTime,
      createEndTime,
    } = queryDto;
    const skip = (pageNo - 1) * pageSize;

    if (!tenantId) {
      throw new BusinessException(
        'Tenant ID is required',
        BusinessErrorCode.MISSING_REQUIRED_PARAMS,
      );
    }

    // 构建查询条件
    const queryBuilder = this.emailTemplateRepository
      .createQueryBuilder('template')
      .where('template.tenantId = :tenantId', { tenantId });

    if (name) {
      queryBuilder.andWhere('template.name LIKE :name', { name: `%${name}%` });
    }

    if (subject) {
      queryBuilder.andWhere('template.subject LIKE :subject', {
        subject: `%${subject}%`,
      });
    }

    if (createStartTime) {
      queryBuilder.andWhere('template.createTime >= :createStartTime', {
        createStartTime: new Date(createStartTime),
      });
    }

    if (createEndTime) {
      queryBuilder.andWhere('template.createTime <= :createEndTime', {
        createEndTime: new Date(createEndTime),
      });
    }

    // 应用分页和排序
    queryBuilder
      .orderBy('template.createTime', 'DESC')
      .skip(skip)
      .take(pageSize);

    // 执行查询
    const [list, total]: [EmailTemplate[], number] =
      await queryBuilder.getManyAndCount();

    // Map EmailTemplate[] to EmailTemplateResponseDto[]
    const responseList = list.map((template: EmailTemplate) => {
      const dto = new EmailTemplateResponseDto();
      dto.id = template.id;
      dto.userId = template.userId;
      dto.tenantId = template.tenantId;
      dto.name = template.name;
      dto.subject = template.subject;
      dto.bodyHtml = template.bodyHtml;
      dto.bodyText = template.bodyText;
      dto.variables = template.variables;
      dto.createTime = template.createTime;
      dto.updateTime = template.updateTime;
      dto.user = template.user
        ? this.transformUserToDto(template.user)
        : undefined;
      return dto;
    });

    return {
      list: responseList,
      total,
    };
  }

  // --- Variable Substitution ---
  // (Moved from NotificationService and made slightly more robust)
  substituteVariables(
    template: string,
    variables?: Record<string, any>,
  ): string {
    if (!variables || Object.keys(variables).length === 0) {
      return template;
    }

    // Replace all variable placeholders
    let substituted = template;
    // First find all variables in the template
    const variableMatches = template.match(/{{\s*(\w+)\s*}}/g);

    if (!variableMatches) {
      return template;
    }

    // Process each matched variable
    for (const varMatch of variableMatches) {
      // Extract the variable name without {{ }} and whitespace
      const varName = varMatch.replace(/{{\s*|\s*}}/g, '');
      // Replace with value or empty string if not found
      const value =
        variables[varName] !== undefined
          ? String(variables[varName] ?? '')
          : '';
      substituted = substituted.replace(varMatch, value);
    }

    return substituted;
  }
}
