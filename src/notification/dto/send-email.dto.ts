import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 邮件发送请求DTO
 */
export class SendEmailDto {
  @ApiProperty({
    description: '接收者邮箱地址列表',
    example: ['user1@example.com', 'user2@example.com'],
    required: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个收件人' })
  @ArrayMaxSize(1000, { message: '单次最多发送给1000个收件人' })
  @IsEmail({}, { each: true, message: '提供的邮箱地址格式无效' })
  recipients!: string[];

  @ApiProperty({
    description: '邮件主题',
    example: '您的验证码',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '邮件主题必须是字符串' })
  @MaxLength(200, { message: '邮件主题不能超过200个字符' })
  subject?: string;

  @ApiProperty({
    description: '邮件内容（HTML格式）',
    example: '<p>您的验证码是：<strong>123456</strong>，5分钟内有效。</p>',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'HTML内容必须是字符串' })
  @MaxLength(65535, { message: 'HTML内容不能超过65535个字符' })
  body?: string;

  @ApiProperty({
    description: '使用的邮件模板ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '模板ID必须是数字' })
  templateId?: number;

  @ApiProperty({
    description: '模板变量',
    example: { code: '123456', name: '张三' },
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  variables?: Record<string, unknown>;

  @ApiProperty({
    description: '计划发送时间（ISO8601格式）',
    example: '2023-08-15T14:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: '计划发送时间必须是ISO8601格式的日期字符串' })
  scheduledAt?: string;
}
