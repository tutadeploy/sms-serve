import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Logger,
  UnauthorizedException,
  Get,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendSmsDto } from './dto/send-sms.dto';
import { SendEmailDto } from './dto/send-email.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { QuerySmsBatchDto } from './dto/query-sms-batch.dto';
import { SmsBatchItemDto } from './dto/sms-batch-list.dto';
import { SmsBatchDetailDto } from './dto/sms-batch-detail.dto';

@ApiTags('notification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Post('sms')
  @ApiOperation({
    summary: '发送短信',
    description: `
    使用预定义的模板发送短信。
    - 支持单个或多个手机号
    - 支持模板变量替换
    - 支持定时发送（可选）
    - 返回批次ID用于后续查询发送状态
    `,
  })
  @ApiResponse({
    status: 201,
    description: '短信发送请求已接受',
    schema: {
      example: {
        batchId: 'SMS_BATCH_20230801123456',
        success: true,
        message: '短信发送请求已接受',
        failedNumbers: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  @ApiResponse({ status: 429, description: '发送频率超限' })
  async sendSms(@Body() sendSmsDto: SendSmsDto, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    return this.notificationService.sendSms(userId, sendSmsDto);
  }

  @Post('email')
  @ApiOperation({
    summary: '发送邮件通知',
    description:
      '创建一个邮件发送批次，并将邮件添加到队列中进行异步处理。支持单条或批量发送。',
  })
  @ApiResponse({
    status: 201,
    description: '邮件发送任务已创建',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误，例如邮箱格式无效或缺少必要参数',
  })
  @ApiResponse({
    status: 401,
    description: '未授权，需要有效的JWT令牌',
  })
  @ApiResponse({
    status: 404,
    description: '模板未找到，请检查templateId',
  })
  async sendEmail(
    @Body() sendEmailDto: SendEmailDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    if (!userId) {
      this.logger.error('User ID not found in authenticated request');
      throw new UnauthorizedException('Invalid authentication token');
    }
    this.logger.log(`User ${userId} initiating Email send request.`);
    return this.notificationService.sendEmail(userId, sendEmailDto);
  }

  @Get('sms/batches')
  @ApiOperation({
    summary: '获取短信批次列表',
    description:
      '获取当前用户的短信发送批次列表，支持分页、状态筛选和时间范围筛选',
  })
  @ApiResponse({
    status: 200,
    description: '短信批次列表',
    schema: {
      type: 'object',
      properties: {
        list: {
          type: 'array',
          items: { $ref: '#/components/schemas/SmsBatchItemDto' },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getSmsBatches(
    @Query() queryDto: QuerySmsBatchDto,
    @Req() req: RequestWithUser,
  ): Promise<{ list: SmsBatchItemDto[]; total: number }> {
    const userId = req.user.userId;
    return this.notificationService.getSmsBatchList(userId, queryDto);
  }

  @Get('sms/batches/:id')
  @ApiOperation({
    summary: '获取短信批次详情',
    description: '获取指定批次ID的详细信息，包括批次状态和消息列表',
  })
  @ApiResponse({
    status: 200,
    description: '短信批次详情',
    type: SmsBatchDetailDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '批次不存在' })
  async getSmsBatchDetail(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<SmsBatchDetailDto> {
    const userId = req.user.userId;
    return this.notificationService.getSmsBatchDetail(userId, id);
  }

  @Post('sms/batches/:id/refresh')
  @ApiOperation({
    summary: '刷新短信批次状态',
    description: '从服务提供商获取最新的短信状态信息并更新批次状态',
  })
  @ApiResponse({
    status: 200,
    description: '短信批次详情',
    type: SmsBatchDetailDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '批次不存在' })
  async refreshBatchStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<SmsBatchDetailDto> {
    const userId = req.user.userId;
    return this.notificationService.refreshBatchStatus(userId, id);
  }
}
