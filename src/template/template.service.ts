import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsTemplate } from './entities/sms-template.entity';
import { EmailTemplate } from '../email-template/entities/email-template.entity';
import { CreateSmsTemplateDto } from './dto/create-sms-template.dto';
import { UpdateSmsTemplateDto } from './dto/update-sms-template.dto';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { SmsTemplatePageReqDto } from './dto/sms-template-page-req.dto';
import { PaginationResDto } from '../common/dto/pagination-res.dto';
import { User, UserRole } from '../user/entities/user.entity';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(SmsTemplate)
    private readonly smsTemplateRepository: Repository<SmsTemplate>,
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // --- SMS Template Methods ---

  async createSmsTemplate(
    userId: number,
    createSmsTemplateDto: CreateSmsTemplateDto,
  ): Promise<SmsTemplate> {
    // 查询用户信息以获取租户ID
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const newTemplate = this.smsTemplateRepository.create({
      ...createSmsTemplateDto,
      userId, // 关联到用户
      tenantId: user.tenantId, // 自动关联到用户的租户
    });
    this.logger.log(
      `User ${userId} creating SMS template: ${newTemplate.name}`,
    );
    return this.smsTemplateRepository.save(newTemplate);
  }

  async findAllSmsTemplates(userId: number): Promise<SmsTemplate[]> {
    return this.smsTemplateRepository.find({ where: { userId } });
  }

  async findOneSmsTemplate(userId: number, id: number): Promise<SmsTemplate> {
    const template = await this.smsTemplateRepository.findOne({
      where: { id, userId },
    });
    if (!template) {
      throw new NotFoundException(
        `SMS Template with ID ${id} not found for user ${userId}`,
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
   * 分页查询短信模板，支持基于角色的数据权限控制
   * @param userId 当前用户ID
   * @param query 查询参数
   * @returns 分页模板列表
   */
  async getTemplatePage(
    userId: number,
    query: SmsTemplatePageReqDto,
  ): Promise<PaginationResDto<SmsTemplate>> {
    const { page = 1, pageSize = 10, name, content, tenantId } = query;
    const skip = (page - 1) * pageSize;

    // 查询当前用户角色
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'tenantId'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // 使用QueryBuilder构建更复杂的查询
    const queryBuilder = this.smsTemplateRepository
      .createQueryBuilder('template')
      .leftJoin('template.user', 'user') // 关联用户表
      .select([
        'template.id',
        'template.name',
        'template.content',
        'template.providerTemplateId',
        'template.variables',
        'template.createdAt',
        'template.updatedAt',
        'user.id',
        'user.username',
        'user.tenantId',
      ]);

    // 根据用户角色确定租户过滤条件
    if (user.role === UserRole.ADMIN) {
      // 管理员可以查看所有模板，或按特定租户过滤
      if (tenantId) {
        // 如果提供了租户ID，则过滤特定租户的模板
        queryBuilder.where('user.tenantId = :tenantId', { tenantId });
      }
      this.logger.log(
        `Admin user ${userId} querying templates${
          tenantId ? ` for tenant ${tenantId}` : ' for all tenants'
        }`,
      );
    } else {
      // 非管理员用户只能查看自己租户的模板
      queryBuilder.where('user.tenantId = :tenantId', {
        tenantId: user.tenantId,
      });
      this.logger.log(
        `Regular user ${userId} (tenant ${user.tenantId}) querying templates`,
      );
    }

    // 添加名称和内容过滤条件
    if (name) {
      queryBuilder.andWhere('template.name LIKE :name', {
        name: `%${name}%`,
      });
    }
    if (content) {
      queryBuilder.andWhere('template.content LIKE :content', {
        content: `%${content}%`,
      });
    }

    // 应用分页和排序
    queryBuilder
      .orderBy('template.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize);

    // 执行查询
    const [list, total] = await queryBuilder.getManyAndCount();

    return new PaginationResDto(list, total, page, pageSize);
  }

  // --- Email Template Methods ---

  async createEmailTemplate(
    userId: number,
    createEmailTemplateDto: CreateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    if (!createEmailTemplateDto.bodyHtml && !createEmailTemplateDto.bodyText) {
      throw new ForbiddenException(
        'Either bodyHtml or bodyText must be provided.',
      );
    }

    // 查询用户信息以获取租户ID
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const newTemplate = this.emailTemplateRepository.create({
      ...createEmailTemplateDto,
      userId,
      tenantId: user.tenantId, // 自动关联到用户的租户
    });
    this.logger.log(
      `User ${userId} creating Email template: ${newTemplate.name}`,
    );
    return this.emailTemplateRepository.save(newTemplate);
  }

  async findAllEmailTemplates(userId: number): Promise<EmailTemplate[]> {
    return this.emailTemplateRepository.find({ where: { userId } });
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

  async removeEmailTemplate(userId: number, id: number): Promise<void> {
    const result = await this.emailTemplateRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Email Template with ID ${id} not found for user ${userId}`,
      );
    }
    this.logger.log(`User ${userId} removed Email template ID: ${id}`);
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
