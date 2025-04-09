import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Query,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { TemplateService } from './template.service';
import { CreateSmsTemplateDto } from './dto/create-sms-template.dto';
import { UpdateSmsTemplateDto } from './dto/update-sms-template.dto';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { SmsTemplateResponseDto } from './dto/sms-template-response.dto';
import { EmailTemplateResponseDto } from '../email-template/dto/email-template-response.dto';
import { SmsTemplatePageDto } from './dto/sms-template-page.dto';
import { EmailTemplatePageDto } from './dto/email-template-page.dto';
import { QuerySmsTemplatePageDto } from './dto/query-sms-template-page.dto';
import { QueryEmailTemplatePageDto } from './dto/query-email-template-page.dto';
import { EmailTemplate } from '../email-template/entities/email-template.entity';
import { UserDto } from '../user/dto/user.dto';

// Reuse interface from NotificationController or define locally
interface AuthenticatedUser {
  sub: number; // Keep sub for JWT standard, even if not used directly here
  username: string;
  roles: string[];
  tenantId: number;
  clientId: string;
  iat: number;
  exp: number;
  iss: string;
}
interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@ApiTags('模板管理')
@ApiBearerAuth()
@Controller('template')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  private readonly logger = new Logger(TemplateController.name);

  constructor(private readonly templateService: TemplateService) {}

  private transformToEmailTemplateResponseDto(
    template: EmailTemplate,
  ): EmailTemplateResponseDto {
    const responseDto = new EmailTemplateResponseDto();
    responseDto.id = template.id;
    responseDto.userId = template.userId;
    responseDto.tenantId = template.tenantId;
    responseDto.name = template.name;
    responseDto.subject = template.subject;
    responseDto.bodyHtml = template.bodyHtml;
    responseDto.bodyText = template.bodyText;
    responseDto.variables = template.variables;
    responseDto.createTime = template.createTime;
    responseDto.updateTime = template.updateTime;

    if (template.user) {
      const userDto = new UserDto();
      userDto.id = template.user.id;
      userDto.username = template.user.username;
      userDto.email = template.user.email || null;
      userDto.role = template.user.role;
      userDto.isActive = template.user.isActive;
      userDto.tenantId = template.user.tenantId;
      userDto.tenant = template.user.tenant;
      userDto.createTime = template.user.createTime;
      userDto.updateTime = template.user.updateTime;
      responseDto.user = userDto;
    }

    return responseDto;
  }

  // --- SMS Template Endpoints ---

  @Post('sms/create')
  @ApiOperation({ summary: '创建短信模板' })
  @ApiResponse({
    status: 201,
    description: '模板创建成功.',
    type: SmsTemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数错误.' })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 403, description: '模板数量超出限制.' })
  async createSmsTemplate(
    @Body() createSmsTemplateDto: CreateSmsTemplateDto,
    @Req() req: RequestWithUser,
  ): Promise<SmsTemplateResponseDto> {
    const { sub: userId, tenantId } = req.user;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) creating SMS template.`,
    );
    const template = await this.templateService.createSmsTemplate(
      userId,
      tenantId,
      createSmsTemplateDto,
    );

    // 转换为响应 DTO
    const responseDto = new SmsTemplateResponseDto();
    responseDto.id = template.id;
    responseDto.userId = template.userId;
    responseDto.tenantId = template.tenantId;
    responseDto.name = template.name;
    responseDto.content = template.content;
    responseDto.providerTemplateId = template.providerTemplateId ?? null;
    responseDto.variables = template.variables ?? null;
    responseDto.createTime = template.createTime;
    responseDto.updateTime = template.updateTime;

    // 添加用户信息
    if (template.user) {
      const userDto = new UserDto();
      userDto.id = template.user.id;
      userDto.username = template.user.username;
      userDto.email = template.user.email ?? null;
      userDto.role = template.user.role;
      userDto.isActive = template.user.isActive;
      userDto.tenantId = template.user.tenantId;
      userDto.tenant = template.user.tenant;
      userDto.createTime = template.user.createTime;
      userDto.updateTime = template.user.updateTime;
      responseDto.user = userDto;
    }

    return responseDto;
  }

  @Get('sms/page')
  @ApiOperation({ summary: '分页获取当前租户的短信模板' })
  @ApiOkResponse({
    description: '成功获取模板分页列表.',
    type: SmsTemplatePageDto,
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  async getSmsTemplatePage(
    @Query() queryDto: QuerySmsTemplatePageDto,
    @Req() req: RequestWithUser,
  ): Promise<SmsTemplatePageDto> {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) fetching SMS templates page with query: ${JSON.stringify(queryDto)}`,
    );
    return await this.templateService.getSmsTemplatePage(tenantId, queryDto);
  }

  @Get('sms/list')
  @ApiOperation({ summary: '查询当前租户的所有短信模板' })
  @ApiResponse({
    status: 200,
    description: '查询成功.',
    type: [SmsTemplateResponseDto],
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  async findAllSmsTemplates(
    @Req() req: RequestWithUser,
  ): Promise<SmsTemplateResponseDto[]> {
    console.log('req.user in findAllSmsTemplates:', req.user);
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) querying all SMS templates.`,
    );
    const templates =
      await this.templateService.findAllSmsTemplatesByTenant(tenantId);

    // 转换为响应 DTO
    return templates.map((template) => {
      const responseDto = new SmsTemplateResponseDto();
      responseDto.id = template.id;
      responseDto.userId = template.userId;
      responseDto.tenantId = template.tenantId;
      responseDto.name = template.name;
      responseDto.content = template.content;
      responseDto.providerTemplateId = template.providerTemplateId ?? null;
      responseDto.variables = template.variables ?? null;
      responseDto.createTime = template.createTime;
      responseDto.updateTime = template.updateTime;

      if (template.user) {
        const userDto = new UserDto();
        userDto.id = template.user.id;
        userDto.username = template.user.username;
        userDto.email = template.user.email ?? null;
        userDto.role = template.user.role;
        userDto.isActive = template.user.isActive;
        userDto.tenantId = template.user.tenantId;
        userDto.tenant = template.user.tenant;
        userDto.createTime = template.user.createTime;
        userDto.updateTime = template.user.updateTime;
        responseDto.user = userDto;
      }

      return responseDto;
    });
  }

  @Get('sms/get')
  @ApiOperation({ summary: '获取单个短信模板详情' })
  @ApiQuery({
    name: 'id',
    description: '短信模板 ID',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取模板详情.',
    type: SmsTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该租户.' })
  async findOneSmsTemplate(
    @Query('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<SmsTemplateResponseDto> {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    const template = await this.templateService.findOneSmsTemplateByTenant(
      tenantId,
      id,
    );

    // 转换为响应 DTO
    const responseDto = new SmsTemplateResponseDto();
    responseDto.id = template.id;
    responseDto.userId = template.userId;
    responseDto.tenantId = template.tenantId;
    responseDto.name = template.name;
    responseDto.content = template.content;
    responseDto.providerTemplateId = template.providerTemplateId ?? null;
    responseDto.variables = template.variables ?? null;
    responseDto.createTime = template.createTime;
    responseDto.updateTime = template.updateTime;

    if (template.user) {
      const userDto = new UserDto();
      userDto.id = template.user.id;
      userDto.username = template.user.username;
      userDto.email = template.user.email ?? null;
      userDto.role = template.user.role;
      userDto.isActive = template.user.isActive;
      userDto.tenantId = template.user.tenantId;
      userDto.tenant = template.user.tenant;
      userDto.createTime = template.user.createTime;
      userDto.updateTime = template.user.updateTime;
      responseDto.user = userDto;
    }

    return responseDto;
  }

  @Put('sms/update')
  @ApiOperation({ summary: '更新短信模板' })
  @ApiQuery({
    name: 'id',
    description: '短信模板 ID',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '模板更新成功.',
    type: SmsTemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数错误.' })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该租户.' })
  async updateSmsTemplate(
    @Query('id', ParseIntPipe) id: number,
    @Body() updateSmsTemplateDto: UpdateSmsTemplateDto,
    @Req() req: RequestWithUser,
  ): Promise<SmsTemplateResponseDto> {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) updating SMS template ${id}.`,
    );
    const template = await this.templateService.updateSmsTemplateByTenant(
      tenantId,
      id,
      updateSmsTemplateDto,
    );

    // 转换为响应 DTO
    const responseDto = new SmsTemplateResponseDto();
    responseDto.id = template.id;
    responseDto.userId = template.userId;
    responseDto.tenantId = template.tenantId;
    responseDto.name = template.name;
    responseDto.content = template.content;
    responseDto.providerTemplateId = template.providerTemplateId ?? null;
    responseDto.variables = template.variables ?? null;
    responseDto.createTime = template.createTime;
    responseDto.updateTime = template.updateTime;

    if (template.user) {
      const userDto = new UserDto();
      userDto.id = template.user.id;
      userDto.username = template.user.username;
      userDto.email = template.user.email ?? null;
      userDto.role = template.user.role;
      userDto.isActive = template.user.isActive;
      userDto.tenantId = template.user.tenantId;
      userDto.tenant = template.user.tenant;
      userDto.createTime = template.user.createTime;
      userDto.updateTime = template.user.updateTime;
      responseDto.user = userDto;
    }

    return responseDto;
  }

  @Delete('sms/delete')
  @ApiOperation({ summary: '删除短信模板' })
  @ApiQuery({
    name: 'id',
    description: '短信模板 ID',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '删除成功.',
    schema: { example: {} },
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板不存在或不属于该租户.' })
  @HttpCode(HttpStatus.OK)
  async removeSmsTemplate(
    @Query('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) deleting SMS template ${id}.`,
    );
    await this.templateService.removeSmsTemplateByTenant(tenantId, id);
  }

  // --- Email Template Endpoints ---

  @Post('email/create')
  @ApiOperation({ summary: '创建邮件模板' })
  @ApiResponse({
    status: 201,
    description: '模板创建成功.',
    type: EmailTemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数错误.' })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 403, description: '模板数量超出限制.' })
  async createEmailTemplate(
    @Body() createEmailTemplateDto: CreateEmailTemplateDto,
    @Req() req: RequestWithUser,
  ): Promise<EmailTemplateResponseDto> {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) creating email template.`,
    );
    const template = await this.templateService.createEmailTemplate(
      userId,
      tenantId,
      createEmailTemplateDto,
    );
    return this.transformToEmailTemplateResponseDto(template);
  }

  @Get('email/page')
  @ApiOperation({ summary: '分页获取当前租户的邮件模板' })
  @ApiOkResponse({
    description: '成功获取模板分页列表.',
    type: EmailTemplatePageDto,
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  async getEmailTemplatePage(
    @Query() queryDto: QueryEmailTemplatePageDto,
    @Req() req: RequestWithUser,
  ): Promise<EmailTemplatePageDto> {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) fetching email templates page with query: ${JSON.stringify(queryDto)}`,
    );
    return await this.templateService.getEmailTemplatePage(tenantId, queryDto);
  }

  @Get('email/list')
  @ApiOperation({ summary: '查询当前租户的所有邮件模板' })
  @ApiResponse({
    status: 200,
    description: '查询成功.',
    type: [EmailTemplateResponseDto],
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  async findAllEmailTemplates(
    @Req() req: RequestWithUser,
  ): Promise<EmailTemplateResponseDto[]> {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) querying all email templates.`,
    );
    const templates =
      await this.templateService.findAllEmailTemplatesByTenant(tenantId);
    return templates.map((template) =>
      this.transformToEmailTemplateResponseDto(template),
    );
  }

  @Get('email/get')
  @ApiOperation({ summary: '获取单个邮件模板详情' })
  @ApiQuery({
    name: 'id',
    description: '邮件模板 ID',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取模板详情.',
    type: EmailTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该租户.' })
  async findOneEmailTemplate(
    @Query('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<EmailTemplateResponseDto> {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) querying email template ${id}.`,
    );
    const template = await this.templateService.findOneEmailTemplateByTenant(
      tenantId,
      id,
    );
    return this.transformToEmailTemplateResponseDto(template);
  }

  @Put('email/update')
  @ApiOperation({ summary: '更新邮件模板' })
  @ApiQuery({
    name: 'id',
    description: '邮件模板 ID',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '更新成功.',
    type: EmailTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该租户.' })
  async updateEmailTemplate(
    @Query('id', ParseIntPipe) id: number,
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
    @Req() req: RequestWithUser,
  ): Promise<EmailTemplateResponseDto> {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) updating email template ${id}.`,
    );
    const template = await this.templateService.updateEmailTemplateByTenant(
      tenantId,
      id,
      updateEmailTemplateDto,
    );
    return this.transformToEmailTemplateResponseDto(template);
  }

  @Delete('email/delete')
  @ApiOperation({ summary: '删除邮件模板' })
  @ApiQuery({
    name: 'id',
    description: '邮件模板 ID',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '模板删除成功.',
    schema: { example: {} },
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该租户.' })
  @HttpCode(HttpStatus.OK)
  async removeEmailTemplate(
    @Query('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User not associated with any tenant');
    }
    this.logger.log(
      `User ${userId} (Tenant ${tenantId}) deleting email template ${id}.`,
    );
    await this.templateService.removeEmailTemplateByTenant(tenantId, id);
  }
}
