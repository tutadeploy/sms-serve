import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationReqDto } from '../../common/dto/pagination-req.dto';

export class SmsTemplatePageReqDto extends PaginationReqDto {
  @ApiPropertyOptional({
    description: '模板名称 (模糊查询)',
    example: '验证码',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '模板内容 (模糊查询)',
    example: '验证码',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '租户ID（仅管理员可用）',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tenantId?: number;
}
