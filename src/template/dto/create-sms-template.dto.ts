// src/template/dto/create-sms-template.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSmsTemplateDto {
  @ApiProperty({ description: '模板名称', example: 'Verification Code' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: '模板内容，使用 {{变量名}} 表示变量',
    example: '您的验证码是 {{code}}，5分钟内有效。',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500) // 根据运营商限制调整
  content!: string;

  @ApiPropertyOptional({
    description: '模板中使用的变量列表',
    example: ['code'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({
    description: '需要在服务商处报备的模板ID (如果需要)',
    example: 'SMS_12345678',
  })
  @IsOptional()
  @IsString()
  providerTemplateId?: string;

  // userId 将从认证信息中获取，不由 DTO 提供
}
