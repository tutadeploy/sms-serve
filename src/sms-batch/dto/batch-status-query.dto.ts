import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 批次状态查询的数据传输对象
 */
export class BatchStatusQueryDto {
  @ApiProperty({
    description: '批次ID',
    example: 1,
    required: true,
  })
  @IsNumber()
  @Type(() => Number)
  batchId: number;

  @ApiProperty({
    description: '租户ID（可选，默认为1）',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tenantId?: number;

  @ApiProperty({
    description: '用户ID（可选，默认为1）',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;
}
