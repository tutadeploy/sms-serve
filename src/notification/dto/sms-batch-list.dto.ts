import { ApiProperty } from '@nestjs/swagger';

export class SmsBatchItemDto {
  @ApiProperty({
    description: '批次ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  userId!: number;

  @ApiProperty({
    description: '批次名称',
    example: 'SMS Batch 2023-08-01T12:00:00.000Z',
  })
  name!: string;

  @ApiProperty({
    description: '批次状态',
    example: 'completed',
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  })
  status!: string;

  @ApiProperty({
    description: '内容类型',
    example: 'template',
    enum: ['template', 'direct'],
  })
  contentType!: string;

  @ApiProperty({
    description: '模板ID',
    example: 1,
    nullable: true,
  })
  templateId!: number | null;

  @ApiProperty({
    description: '接收者数量',
    example: 10,
  })
  totalRecipients!: number;

  @ApiProperty({
    description: '已处理数量',
    example: 10,
  })
  processedCount!: number;

  @ApiProperty({
    description: '成功发送数量',
    example: 8,
  })
  successCount!: number;

  @ApiProperty({
    description: '发送失败数量',
    example: 2,
  })
  failureCount!: number;

  @ApiProperty({
    description: '创建时间',
    example: '2023-08-01T12:00:00.000Z',
  })
  createTime!: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2023-08-01T12:05:00.000Z',
  })
  updateTime!: Date;
}

export class SmsBatchPageDto {
  @ApiProperty({
    description: '批次列表',
    type: [SmsBatchItemDto],
  })
  list!: SmsBatchItemDto[];

  @ApiProperty({
    description: '总记录数',
    example: 100,
  })
  total!: number;
}
