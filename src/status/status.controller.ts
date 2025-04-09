import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  Logger,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { StatusService } from './status.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import {
  SmsBatchResponseDto,
  SmsMessageResponseDto,
} from '../sms/dto/sms-service-response.dto';
import {
  EmailBatchResponseDto,
  EmailMessageResponseDto,
} from '../email-message/dto/email-message-response.dto';
import { BatchMessagesFilterDto } from './dto/get-batch-messages.dto';
import { SmsMessagePageReqDto } from './dto/sms-message-page.dto';
import { SmsReceivedMessagePageReqDto } from './dto/sms-received-message-page.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { EmailReceivedMessagePageReqDto } from './dto/email-received-message-page.dto';
import { EmailReceivedMessage } from '../email-received-message/entities/email-received-message.entity';

// Define the AuthenticatedUser interface
interface AuthenticatedUser {
  sub: number;
  username: string;
  role?: string;
  userId?: number; // Add optional userId property
}

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@ApiTags('status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('status')
export class StatusController {
  private readonly logger = new Logger(StatusController.name);

  constructor(private readonly statusService: StatusService) {}

  // --- SMS Status Endpoints ---

  @Get('sms/messages')
  @ApiOperation({
    summary: '分页查询短信发送记录',
    description: '支持按接收人、状态和批次ID过滤，返回满足条件的短信记录',
  })
  @ApiOkResponse({
    description: '成功获取短信记录',
    type: PaginatedResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  getAllSmsMessages(
    @Req() req: RequestWithUser,
    @Query() query: SmsMessagePageReqDto,
  ) {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(`User ${userId} querying SMS messages`);
    return this.statusService.getAllSmsMessages(userId, query);
  }

  @Get('sms/received')
  @ApiOperation({
    summary: '分页查询短信接收记录',
    description: '支持按发送人、接收人和内容过滤，返回满足条件的接收记录',
  })
  @ApiOkResponse({
    description: '成功获取短信接收记录',
    type: PaginatedResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  getSmsReceivedMessages(
    @Req() req: RequestWithUser,
    @Query() query: SmsReceivedMessagePageReqDto,
  ) {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(`User ${userId} querying SMS received messages`);
    return this.statusService.getSmsReceivedMessages(userId, query);
  }

  @Get('sms/batch/:batchId')
  @ApiOperation({
    summary: '获取指定短信发送批次的状态',
    description:
      '返回指定批次的详细信息，包括批次状态、成功/失败数量以及所有短信的状态',
  })
  @ApiParam({
    name: 'batchId',
    description: '短信批次 ID',
    required: true,
    type: Number,
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取批次状态',
    type: SmsBatchResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '没有权限访问该批次' })
  @ApiResponse({ status: 404, description: '批次未找到' })
  getSmsBatchStatus(
    @Param('batchId', ParseIntPipe) batchId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.statusService.getSmsBatchStatus(userId, batchId);
  }

  @Get('sms/message/:messageId')
  @ApiOperation({
    summary: '获取指定单条短信的状态',
    description: '返回单条短信的详细信息，包括发送状态、接收者和内容',
  })
  @ApiParam({
    name: 'messageId',
    description: '短信消息 ID',
    required: true,
    type: Number,
    example: 456,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取消息状态',
    type: SmsMessageResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '没有权限访问该消息' })
  @ApiResponse({ status: 404, description: '消息未找到' })
  getSmsMessageStatus(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.statusService.getSmsMessageStatus(userId, messageId);
  }

  @Get('sms/batch/:batchId/messages')
  @ApiOperation({
    summary: '获取短信批次中的消息列表',
    description: '支持分页和过滤条件，返回批次中的短信消息列表',
  })
  @ApiParam({
    name: 'batchId',
    description: '短信批次 ID',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取消息列表',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '没有权限访问该批次' })
  @ApiResponse({ status: 404, description: '批次未找到' })
  getSmsBatchMessages(
    @Param('batchId', ParseIntPipe) batchId: number,
    @Req() req: RequestWithUser,
    @Query() filter: BatchMessagesFilterDto,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.statusService.getSmsBatchMessages(userId, batchId, filter);
  }

  // --- Email Status Endpoints ---

  @Get('email/batch/:batchId')
  @ApiOperation({
    summary: '获取指定邮件发送批次的状态',
    description:
      '返回指定批次的详细信息，包括批次状态、成功/失败数量以及所有邮件的状态',
  })
  @ApiParam({
    name: 'batchId',
    description: '邮件批次 ID',
    required: true,
    type: Number,
    example: 789,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取批次状态',
    type: EmailBatchResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '没有权限访问该批次' })
  @ApiResponse({ status: 404, description: '批次未找到' })
  getEmailBatchStatus(
    @Param('batchId', ParseIntPipe) batchId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.statusService.getEmailBatchStatus(userId, batchId);
  }

  @Get('email/message/:messageId')
  @ApiOperation({
    summary: '获取指定单条邮件的状态',
    description: '返回单条邮件的详细信息，包括发送状态、接收者和主题',
  })
  @ApiParam({
    name: 'messageId',
    description: '邮件消息 ID',
    required: true,
    type: Number,
    example: 101,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取消息状态',
    type: EmailMessageResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '没有权限访问该消息' })
  @ApiResponse({ status: 404, description: '消息未找到' })
  getEmailMessageStatus(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.statusService.getEmailMessageStatus(userId, messageId);
  }

  @Get('email/batch/:batchId/messages')
  @ApiOperation({
    summary: '获取邮件批次中的消息列表',
    description: '支持分页和过滤条件，返回批次中的邮件消息列表',
  })
  @ApiParam({
    name: 'batchId',
    description: '邮件批次 ID',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取消息列表',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '没有权限访问该批次' })
  @ApiResponse({ status: 404, description: '批次未找到' })
  getEmailBatchMessages(
    @Param('batchId', ParseIntPipe) batchId: number,
    @Req() req: RequestWithUser,
    @Query() filter: BatchMessagesFilterDto,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.statusService.getEmailBatchMessages(userId, batchId, filter);
  }

  @Get('email/received')
  @ApiOperation({
    summary: '分页查询接收到的邮件',
    description: '支持按发送人、接收人、主题和类型过滤，返回满足条件的接收记录',
  })
  @ApiOkResponse({
    description: '接收到的邮件列表',
    type: PaginatedResponseDto<EmailReceivedMessage>,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getEmailReceivedMessages(
    @Query() query: EmailReceivedMessagePageReqDto,
    @Req() req: RequestWithUser,
  ): Promise<PaginatedResponseDto<EmailReceivedMessage>> {
    const userId = this.getUserIdFromRequest(req);
    this.logger.log(`User ${userId} querying email received messages`);
    return this.statusService.getEmailReceivedMessages(userId, query);
  }

  // Helper function to extract userId safely
  private getUserIdFromRequest(req: RequestWithUser): number {
    const user = req.user;
    if (!user) {
      this.logger.error('User not found in authenticated request');
      throw new UnauthorizedException('Invalid authentication token');
    }

    const userId = 'userId' in user ? user.userId : user.sub;
    if (userId === undefined || userId === null) {
      this.logger.error('User ID not found in authenticated request');
      throw new UnauthorizedException('Invalid authentication token');
    }

    return Number(userId);
  }
}
