import { ApiProperty } from '@nestjs/swagger';
import { SmsBatchItemDto } from './sms-batch-list.dto';

export class SmsMessageItemDto {
  @ApiProperty({
    description: '消息ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '批次ID',
    example: 1,
  })
  batchId!: number;

  @ApiProperty({
    description: '接收者手机号',
    example: '13800138000',
  })
  recipientNumber!: string;

  @ApiProperty({
    description: '消息状态',
    example: 'sent',
    enum: [
      'pending',
      'queued',
      'sending',
      'sent',
      'delivered',
      'failed',
      'rejected',
      'unknown',
    ],
  })
  status!: string;

  @ApiProperty({
    description: '服务商返回的消息ID',
    example: 'MSG_12345',
    nullable: true,
  })
  providerMessageId!: string | null;

  @ApiProperty({
    description: '错误信息',
    example: '手机号格式不正确',
    nullable: true,
  })
  errorMessage!: string | null;

  @ApiProperty({
    description: '发送时间',
    example: '2023-08-01T12:01:00.000Z',
    nullable: true,
  })
  sendTime!: Date | null;

  @ApiProperty({
    description: '状态更新时间',
    example: '2023-08-01T12:02:00.000Z',
    nullable: true,
  })
  statusUpdateTime!: Date | null;

  @ApiProperty({
    description: '创建时间',
    example: '2023-08-01T12:00:00.000Z',
  })
  createTime!: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2023-08-01T12:02:00.000Z',
  })
  updateTime!: Date;
}

export class SmsBatchDetailDto extends SmsBatchItemDto {
  @ApiProperty({
    description: '发送内容',
    example: '您的验证码是123456，5分钟内有效',
    nullable: true,
  })
  directContent!: string | null;

  @ApiProperty({
    description: '模板参数',
    example: { code: '123456' },
    nullable: true,
  })
  templateParams!: Record<string, any> | null;

  @ApiProperty({
    description: '服务商ID',
    example: 1,
  })
  providerId!: number;

  @ApiProperty({
    description: '接收者手机号列表 (逗号分隔)',
    example: '13800138000,13912345678',
  })
  recipientNumbers!: string;

  @ApiProperty({
    description: '消息详情列表',
    type: [SmsMessageItemDto],
  })
  messages!: SmsMessageItemDto[];
}
