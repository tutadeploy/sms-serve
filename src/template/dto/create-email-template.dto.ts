import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ArrayUnique,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmailTemplateDto {
  @ApiProperty({ description: '模板名称', example: 'Welcome Email' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: '默认邮件主题',
    example: 'Welcome to Our Service!',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject!: string;

  @ApiPropertyOptional({
    description: 'HTML 格式邮件正文模板',
    example: '<p>Hi {{name}}!</p>',
  })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiPropertyOptional({
    description: '纯文本格式邮件正文模板',
    example: '请访问 {{resetLink}} 重置密码。',
  })
  @IsOptional()
  @IsString()
  bodyText?: string;

  // 验证：bodyHtml 和 bodyText 至少要有一个
  // 可以通过自定义验证器实现，或在服务层检查

  @ApiPropertyOptional({
    description: '模板中使用的变量名列表',
    example: ['appName', 'resetLink'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  variables?: string[];

  // userId 将从认证信息中获取
}
