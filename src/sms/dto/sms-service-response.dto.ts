import { ApiProperty } from '@nestjs/swagger';
import { SmsStatus } from '@/sms-message/entities/sms-message.entity';
import { BatchStatus } from '@/sms-notification-batch/entities/sms-notification-batch.entity';

/**
 * SMS消息状态DTO - 用于API响应
 */
export class SmsMessageResponseDto {
  @ApiProperty({
    description: '短信消息ID',
    example: 12345,
  })
  id!: number;

  @ApiProperty({
    description: '所属批次ID',
    example: 100,
  })
  batchId!: number;

  @ApiProperty({
    description: '接收者电话号码',
    example: '+8613900001234',
  })
  recipientNumber!: string;

  @ApiProperty({
    description: '短信内容',
    example: '您的验证码是: 123456，5分钟内有效',
    nullable: true,
  })
  directContent?: string;

  @ApiProperty({
    description: '内容类型',
    example: 'template',
    enum: ['template', 'direct'],
    nullable: true,
  })
  contentType?: string;

  @ApiProperty({
    description: '模板ID',
    example: 1,
    nullable: true,
  })
  templateId?: number;

  @ApiProperty({
    description: '模板名称',
    example: '验证码模板',
    nullable: true,
  })
  templateName?: string;

  @ApiProperty({
    description: '模板参数',
    example: { code: '123456' },
    nullable: true,
  })
  templateParams?: Record<string, any>;

  @ApiProperty({
    description: '发送状态',
    enum: [
      'pending',
      'queued',
      'submitted',
      'sent',
      'delivered',
      'failed',
      'rejected',
      'unknown',
      'sending',
    ],
    example: 'sent',
  })
  status!: SmsStatus;

  @ApiProperty({
    description: '短信提供商的消息ID',
    example: 'sms-provider-msg-id-12345',
    required: false,
    nullable: true,
  })
  providerMessageId?: string;

  @ApiProperty({
    description: '错误信息（如果发送失败）',
    example: '号码无效',
    required: false,
    nullable: true,
  })
  errorMessage?: string;

  @ApiProperty({
    description: '发送时间',
    example: '2023-08-01T12:34:56Z',
    required: false,
    nullable: true,
  })
  sendTime?: Date;

  @ApiProperty({
    description: '状态更新时间',
    example: '2023-08-01T12:35:00Z',
    required: false,
    nullable: true,
  })
  statusUpdateTime?: Date;
}

/**
 * SMS批次状态DTO - 用于API响应
 */
export class SmsBatchResponseDto {
  @ApiProperty({
    description: '批次ID',
    example: 100,
  })
  id!: number;

  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  userId!: number;

  @ApiProperty({
    description: '批次状态',
    enum: [
      'pending',
      'processing',
      'partially_completed',
      'completed',
      'failed',
    ],
    example: 'completed',
  })
  status!: BatchStatus;

  @ApiProperty({
    description: '总消息数',
    example: 10,
  })
  totalCount!: number;

  @ApiProperty({
    description: '发送成功数',
    example: 8,
  })
  successCount!: number;

  @ApiProperty({
    description: '发送失败数',
    example: 2,
  })
  failedCount!: number;

  @ApiProperty({
    description: '创建时间',
    example: '2023-08-01T12:30:00Z',
  })
  createTime!: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2023-08-01T12:36:00Z',
  })
  updateTime!: Date;

  @ApiProperty({
    description: '计划发送时间（如果是定时发送）',
    example: '2023-08-01T14:00:00Z',
    required: false,
    nullable: true,
  })
  scheduledAt?: Date;

  @ApiProperty({
    description: '短信消息列表',
    type: [SmsMessageResponseDto],
    required: false,
  })
  messages?: SmsMessageResponseDto[];
}

/**
 * 发送短信的响应DTO
 */
export class SendSmsResponseDto {
  @ApiProperty({
    description: '批次ID',
    example: 100,
  })
  batchId!: number;

  @ApiProperty({
    description: '批次状态',
    enum: [
      'pending',
      'processing',
      'partially_completed',
      'completed',
      'failed',
    ],
    example: 'pending',
  })
  status!: BatchStatus;

  @ApiProperty({
    description: '总消息数',
    example: 10,
  })
  totalCount!: number;

  @ApiProperty({
    description: '计划发送时间（如果是定时发送）',
    example: '2023-08-01T14:00:00Z',
    required: false,
    nullable: true,
  })
  scheduledAt?: Date;

  @ApiProperty({
    description: '创建时间',
    example: '2023-08-01T12:30:00Z',
  })
  createTime!: Date;
}
