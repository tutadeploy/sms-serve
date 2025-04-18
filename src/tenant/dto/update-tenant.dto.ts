import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsEmail,
  IsISO8601,
} from 'class-validator';
import { TenantStatus } from '../entities/tenant.entity';

export class UpdateTenantDto {
  @ApiProperty({
    description: '租户名称',
    example: '芋道源码',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '租户唯一编码',
    example: 'yudao',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    description: '租户网站地址',
    example: 'https://www.example.com',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: '请输入有效的网站地址' })
  website?: string;

  @ApiProperty({
    description: '联系邮箱',
    example: 'contact@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  contactEmail?: string;

  @ApiProperty({
    description: '联系电话',
    example: '13800138000',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({
    description: 'Logo URL',
    example: 'https://www.example.com/logo.png',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: '请输入有效的Logo URL' })
  logoUrl?: string;

  @ApiProperty({
    description: '租户状态',
    enum: TenantStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiProperty({
    description: '过期日期',
    example: '2023-12-31',
    required: false,
  })
  @IsOptional()
  @IsISO8601()
  expirationDate?: string;
}
