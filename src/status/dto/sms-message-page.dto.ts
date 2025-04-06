import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsInt } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// 可以根据实际表结构定义更多的状态
export enum SmsMessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export class SmsMessagePageReqDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '接收人手机号 (模糊查询)',
    example: '1380',
  })
  @IsOptional()
  @IsString()
  recipientNumber?: string;

  @ApiPropertyOptional({
    description: '状态',
    enum: SmsMessageStatus,
    example: SmsMessageStatus.DELIVERED,
  })
  @IsOptional()
  @IsEnum(SmsMessageStatus)
  status?: SmsMessageStatus;

  @ApiPropertyOptional({
    description: '批次ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  batchId?: number;

  @ApiPropertyOptional({
    description: '租户ID (仅管理员可用)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;
}
