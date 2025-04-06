import { ApiProperty } from '@nestjs/swagger';

/**
 * 邮件消息状态DTO - 用于API响应
 */
export class EmailMessageResponseDto {
  @ApiProperty({
    description: '邮件消息ID',
    example: 12345,
  })
  id!: number;

  @ApiProperty({
    description: '所属批次ID',
    example: 100,
  })
  batchId!: number;

  @ApiProperty({
    description: '接收者邮箱地址',
    example: 'user@example.com',
  })
  recipientEmail!: string;

  @ApiProperty({
    description: '邮件主题',
    example: '您的验证码',
  })
  subject!: string;

  @ApiProperty({
    description: '发送状态',
    enum: [
      'pending',
      'queued',
      'sending',
      'sent',
      'delivered',
      'failed',
      'rejected',
      'bounced',
    ],
    example: 'sent',
  })
  status!: string;

  @ApiProperty({
    description: '邮件提供商的消息ID',
    example: 'email-provider-msg-id-12345',
    required: false,
    nullable: true,
  })
  providerMessageId?: string;

  @ApiProperty({
    description: '错误信息（如果发送失败）',
    example: '邮箱地址不存在',
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
  sentAt?: Date;

  @ApiProperty({
    description: '状态更新时间',
    example: '2023-08-01T12:35:00Z',
  })
  statusUpdatedAt!: Date;
}

/**
 * 邮件批次状态DTO - 用于API响应
 */
export class EmailBatchResponseDto {
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
  status!: string;

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
  createdAt!: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2023-08-01T12:36:00Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: '计划发送时间（如果是定时发送）',
    example: '2023-08-01T14:00:00Z',
    required: false,
    nullable: true,
  })
  scheduledAt?: Date;

  @ApiProperty({
    description: '邮件消息列表',
    type: [EmailMessageResponseDto],
    required: false,
  })
  messages?: EmailMessageResponseDto[];
}

/**
 * 发送邮件的响应DTO
 */
export class SendEmailResponseDto {
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
  status!: string;

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
  createdAt!: Date;
}
