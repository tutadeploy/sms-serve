import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  Query,
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
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Request } from 'express'; // Assuming Express platform
import { SmsTemplatePageReqDto } from './dto/sms-template-page-req.dto';
import { PaginationResDto } from '../common/dto/pagination-res.dto';
import { SmsTemplate } from './entities/sms-template.entity';

// Reuse interface from NotificationController or define locally
interface AuthenticatedUser {
  sub?: number; // JWT standard field, stores user ID
  userId?: number; // Keep original field for backward compatibility
  username: string;
  role?: string; // Role information
}
interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@ApiTags('template')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('template')
export class TemplateController {
  private readonly logger = new Logger(TemplateController.name);

  constructor(private readonly templateService: TemplateService) {}

  // --- SMS Template Endpoints ---

  @Post('sms')
  @ApiOperation({ summary: '创建短信模板' })
  @ApiResponse({
    status: 201,
    description: '模板创建成功.',
    schema: {
      example: {
        id: 1,
        name: '验证码模板',
        content: '您的验证码是: {{code}}，5分钟内有效',
        userId: 1,
        accountId: 100,
        code: 'VERIFICATION_CODE',
        status: 1,
        createdAt: '2023-08-01T12:30:00Z',
        updatedAt: '2023-08-01T12:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: '参数错误.' })
  @ApiResponse({ status: 401, description: '未授权.' })
  createSmsTemplate(
    @Body() createSmsTemplateDto: CreateSmsTemplateDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(`User ${userId} creating SMS template.`);
    return this.templateService.createSmsTemplate(userId, createSmsTemplateDto);
  }

  @Get('sms/page')
  @ApiOperation({ summary: '分页获取当前用户的短信模板' })
  @ApiOkResponse({
    description: '成功获取模板分页列表.',
    type: PaginationResDto<SmsTemplate>,
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  getTemplatePage(
    @Query() query: SmsTemplatePageReqDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(
      `User ${userId} fetching SMS templates page with query: ${JSON.stringify(query)}`,
    );
    return this.templateService.getTemplatePage(userId, query);
  }

  @Get('sms')
  @ApiOperation({ summary: '获取当前用户的所有短信模板 (不分页)' })
  @ApiResponse({
    status: 200,
    description: '成功获取模板列表.',
    schema: {
      example: [
        {
          id: 1,
          name: '验证码模板',
          content: '您的验证码是: {{code}}，5分钟内有效',
          userId: 1,
          accountId: 100,
          code: 'VERIFICATION_CODE',
          status: 1,
          createdAt: '2023-08-01T12:30:00Z',
          updatedAt: '2023-08-01T12:30:00Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  findAllSmsTemplates(@Req() req: RequestWithUser) {
    const userId = this.getUserIdFromRequest(req);
    return this.templateService.findAllSmsTemplates(userId);
  }

  @Get('sms/:id')
  @ApiOperation({ summary: '获取单个短信模板详情' })
  @ApiParam({ name: 'id', description: '短信模板 ID' })
  @ApiResponse({
    status: 200,
    description: '成功获取模板详情.' /*, type: SmsTemplate */,
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该用户.' })
  findOneSmsTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.templateService.findOneSmsTemplate(userId, id);
  }

  @Patch('sms/:id')
  @ApiOperation({ summary: '更新短信模板' })
  @ApiParam({ name: 'id', description: '短信模板 ID' })
  @ApiResponse({
    status: 200,
    description: '模板更新成功.' /*, type: SmsTemplate */,
  })
  @ApiResponse({ status: 400, description: '参数错误.' })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该用户.' })
  updateSmsTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSmsTemplateDto: UpdateSmsTemplateDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(`User ${userId} updating SMS template ID: ${id}.`);
    return this.templateService.updateSmsTemplate(
      userId,
      id,
      updateSmsTemplateDto,
    );
  }

  @Delete('sms/:id')
  @ApiOperation({ summary: '删除短信模板' })
  @ApiParam({ name: 'id', description: '短信模板 ID' })
  @ApiResponse({ status: 204, description: '模板删除成功.' })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该用户.' })
  @HttpCode(HttpStatus.NO_CONTENT) // Set 204 status code on success
  async removeSmsTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(`User ${userId} deleting SMS template ID: ${id}.`);
    await this.templateService.removeSmsTemplate(userId, id);
    // No content to return
  }

  // --- Email Template Endpoints ---

  @Post('email')
  @ApiOperation({ summary: '创建邮件模板' })
  @ApiResponse({
    status: 201,
    description: '模板创建成功.',
    schema: {
      example: {
        id: 1,
        name: '欢迎邮件',
        subject: '欢迎加入我们的服务',
        bodyHtml: '<p>尊敬的 {{name}}，感谢您注册我们的服务！</p>',
        bodyText: '尊敬的 {{name}}，感谢您注册我们的服务！',
        userId: 1,
        accountId: 100,
        code: 'WELCOME_EMAIL',
        status: 1,
        createdAt: '2023-08-01T12:30:00Z',
        updatedAt: '2023-08-01T12:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: '参数错误.' })
  @ApiResponse({ status: 401, description: '未授权.' })
  createEmailTemplate(
    @Body() createEmailTemplateDto: CreateEmailTemplateDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(`User ${userId} creating Email template.`);
    return this.templateService.createEmailTemplate(
      userId,
      createEmailTemplateDto,
    );
  }

  @Get('email')
  @ApiOperation({ summary: '获取当前用户的所有邮件模板' })
  @ApiResponse({
    status: 200,
    description: '成功获取模板列表.',
    schema: {
      example: [
        {
          id: 1,
          name: '欢迎邮件',
          subject: '欢迎加入我们的服务',
          bodyHtml: '<p>尊敬的 {{name}}，感谢您注册我们的服务！</p>',
          bodyText: '尊敬的 {{name}}，感谢您注册我们的服务！',
          userId: 1,
          accountId: 100,
          code: 'WELCOME_EMAIL',
          status: 1,
          createdAt: '2023-08-01T12:30:00Z',
          updatedAt: '2023-08-01T12:30:00Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  findAllEmailTemplates(@Req() req: RequestWithUser) {
    const userId = this.getUserIdFromRequest(req);
    return this.templateService.findAllEmailTemplates(userId);
  }

  @Get('email/:id')
  @ApiOperation({ summary: '获取单个邮件模板详情' })
  @ApiParam({ name: 'id', description: '邮件模板 ID' })
  @ApiResponse({
    status: 200,
    description: '成功获取模板详情.' /*, type: EmailTemplate */,
  })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该用户.' })
  findOneEmailTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.templateService.findOneEmailTemplate(userId, id);
  }

  @Patch('email/:id')
  @ApiOperation({ summary: '更新邮件模板' })
  @ApiParam({ name: 'id', description: '邮件模板 ID' })
  @ApiResponse({
    status: 200,
    description: '模板更新成功.' /*, type: EmailTemplate */,
  })
  @ApiResponse({ status: 400, description: '参数错误.' })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该用户.' })
  updateEmailTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(`User ${userId} updating Email template ID: ${id}.`);
    return this.templateService.updateEmailTemplate(
      userId,
      id,
      updateEmailTemplateDto,
    );
  }

  @Delete('email/:id')
  @ApiOperation({ summary: '删除邮件模板' })
  @ApiParam({ name: 'id', description: '邮件模板 ID' })
  @ApiResponse({ status: 204, description: '模板删除成功.' })
  @ApiResponse({ status: 401, description: '未授权.' })
  @ApiResponse({ status: 404, description: '模板未找到或不属于该用户.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEmailTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(`User ${userId} deleting Email template ID: ${id}.`);
    await this.templateService.removeEmailTemplate(userId, id);
  }

  // Helper function to extract userId safely
  private getUserIdFromRequest(req: RequestWithUser): number {
    // First try to get ID from sub field (JWT standard)
    // If not exist, then try from userId field (keep backward compatibility)
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      this.logger.error('User ID not found in authenticated request', req.user);
      throw new UnauthorizedException('Invalid authentication token');
    }
    return userId;
  }
}
