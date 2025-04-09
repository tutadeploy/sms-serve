import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SmsStatus } from '@/sms-message/entities/sms-message.entity';
import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * 批次消息过滤条件
 */
export class BatchMessagesFilterDto extends PaginationDto {
  @ApiProperty({
    description: '根据消息状态过滤',
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
    required: false,
  })
  @IsOptional()
  @IsEnum(
    [
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
    {
      message: '无效的消息状态',
    },
  )
  status?: SmsStatus;

  @ApiProperty({
    description: '接收者号码（支持模糊搜索）',
    example: '138',
    required: false,
  })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiProperty({
    description: '排序字段',
    enum: ['id', 'status', 'createTime', 'sendTime'],
    default: 'id',
    required: false,
  })
  @IsOptional()
  @IsEnum(['id', 'status', 'createTime', 'sendTime'], {
    message: '无效的排序字段',
  })
  sortBy?: string = 'id';

  @ApiProperty({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false,
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], {
    message: '排序方向必须是 ASC 或 DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
