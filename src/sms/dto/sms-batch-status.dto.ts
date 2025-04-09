import { ApiProperty } from '@nestjs/swagger';

/**
 * 短信消息状态DTO
 */
export class SmsMessageStatusDto {
  @ApiProperty({
    description: '短信消息ID',
    example: 123,
  })
  id!: number;

  @ApiProperty({
    description: '接收者手机号码',
    example: '+8613800138000',
  })
  recipient!: string;

  @ApiProperty({
    description: '短信内容',
    example: '您的验证码是：123456，5分钟内有效。',
  })
  content!: string;

  @ApiProperty({
    description: '短信发送状态',
    example: 'sent',
    enum: ['pending', 'sent', 'failed'],
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
    example: '手机号码不存在',
    nullable: true,
  })
  failReason?: string;

  constructor(partial?: Partial<SmsMessageStatusDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

/**
 * 短信批次状态DTO
 * 包含批次的总体状态和每条短信的状态
 */
export class SmsBatchStatusDto {
  @ApiProperty({
    description: '短信批次ID',
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
    description: '批次中短信总数',
    example: 100,
  })
  totalCount!: number;

  @ApiProperty({
    description: '成功发送的短信数量',
    example: 95,
  })
  successCount!: number;

  @ApiProperty({
    description: '发送失败的短信数量',
    example: 5,
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
    description: '批次中的短信消息列表',
    type: [SmsMessageStatusDto],
  })
  messages!: SmsMessageStatusDto[];

  constructor(partial?: Partial<SmsBatchStatusDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
