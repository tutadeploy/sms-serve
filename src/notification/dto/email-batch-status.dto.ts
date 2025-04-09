import { ApiProperty } from '@nestjs/swagger';

/**
 * 邮件消息状态DTO
 */
export class EmailMessageStatusDto {
  @ApiProperty({
    description: '邮件消息ID',
    example: 123,
  })
  id!: number;

  @ApiProperty({
    description: '接收者邮箱地址',
    example: 'user@example.com',
  })
  recipientEmail!: string;

  @ApiProperty({
    description: '邮件主题',
    example: '您的账户验证码',
  })
  subject!: string;

  @ApiProperty({
    description: '邮件发送状态',
    example: 'sent',
    enum: ['pending', 'queued', 'sent', 'delivered', 'failed', 'rejected'],
  })
  status!: string;

  @ApiProperty({
    description: '发送时间',
    example: '2023-05-12T08:30:00Z',
    nullable: true,
  })
  sendTime?: Date;

  @ApiProperty({
    description: '失败原因',
    example: '邮箱地址不存在',
    nullable: true,
  })
  failReason?: string;

  constructor(partial?: Partial<EmailMessageStatusDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

/**
 * 邮件批次状态DTO
 * 包含批次的总体状态和每封邮件的状态
 */
export class EmailBatchStatusDto {
  @ApiProperty({
    description: '邮件批次ID',
    example: 456,
  })
  id!: number;

  @ApiProperty({
    description: '批次状态',
    example: 'processing',
    enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
  })
  status!: string;

  @ApiProperty({
    description: '批次中邮件总数',
    example: 50,
  })
  totalCount!: number;

  @ApiProperty({
    description: '成功发送的邮件数量',
    example: 48,
  })
  successCount!: number;

  @ApiProperty({
    description: '发送失败的邮件数量',
    example: 2,
  })
  failedCount!: number;

  @ApiProperty({
    description: '批次创建时间',
    example: '2023-05-12T08:00:00Z',
  })
  createTime!: Date;

  @ApiProperty({
    description: '批次最后更新时间',
    example: '2023-05-12T08:35:00Z',
  })
  updateTime!: Date;

  @ApiProperty({
    description: '批次中的邮件消息列表',
    type: [EmailMessageStatusDto],
  })
  messages!: EmailMessageStatusDto[];

  constructor(partial?: Partial<EmailBatchStatusDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
