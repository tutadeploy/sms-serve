// === src/template/dto/query-email-template-page.dto.ts ===
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEmailTemplatePageDto {
  @ApiPropertyOptional({ description: '页码 (默认1)', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  pageNo?: number = 1;

  @ApiPropertyOptional({
    description: '每页条数 (默认10)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数必须是整数' })
  @Min(1, { message: '每页条数最小为1' })
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '模板名称 (模糊查询)', example: '欢迎' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '邮件主题 (模糊查询)', example: '服务' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: '创建开始时间',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  createStartTime?: string;

  @ApiPropertyOptional({
    description: '创建结束时间',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  createEndTime?: string;

  // tenantId 将从认证信息中获取，不由查询参数提供
}
