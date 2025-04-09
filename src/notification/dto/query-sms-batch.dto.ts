import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySmsBatchDto {
  @ApiPropertyOptional({
    description: '批次状态 (可选)',
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    example: 'completed',
  })
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'cancelled'], {
    message:
      '状态必须是 pending, processing, completed, failed, cancelled 其中之一',
  })
  status?: string;

  @ApiPropertyOptional({
    description: '页码 (默认1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo?: number = 1;

  @ApiPropertyOptional({
    description: '每页条数 (默认10)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description: '创建开始时间 (ISO 8601 格式)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  createStartTime?: string;

  @ApiPropertyOptional({
    description: '创建结束时间 (ISO 8601 格式)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  createEndTime?: string;
}
