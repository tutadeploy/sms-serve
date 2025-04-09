import { ApiProperty } from '@nestjs/swagger';

/**
 * 邮件发送响应DTO
 * 包含批次ID和消息数量的响应对象
 */
export class EmailResponseDto {
  @ApiProperty({
    description: '创建的邮件批次ID',
    example: 123,
  })
  batchId!: number;

  @ApiProperty({
    description: '批次中的邮件消息数量',
    example: 20,
  })
  messageCount!: number;

  @ApiProperty({
    description: '批次状态',
    example: 'pending',
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  status!: string;

  @ApiProperty({
    description: '批次创建时间',
    example: '2023-05-12T08:00:00Z',
  })
  createTime!: Date;

  constructor(partial?: Partial<EmailResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
