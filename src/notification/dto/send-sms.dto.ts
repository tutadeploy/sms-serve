import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  IsObject,
  IsDateString,
  ArrayNotEmpty,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({
    description: '短信服务商的 ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  providerId!: number;

  @ApiProperty({
    description: '接收短信的手机号码列表',
    type: [String],
    example: ['13800138000', '13912345678'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  recipients!: string[];

  @ApiPropertyOptional({
    description: '短信内容 (如果未提供 templateId 则必须)',
    example: '您的验证码是123456，5分钟内有效',
  })
  @ValidateIf((o: SendSmsDto) => !o.templateId)
  @IsNotEmpty({ message: '短信内容或模板ID必须提供' })
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({
    description: '使用的短信模板 ID (如果未提供 content 则必须)',
    example: 1,
  })
  @ValidateIf((o: SendSmsDto) => !o.content)
  @IsNotEmpty({ message: '短信内容或模板ID必须提供' })
  @IsInt()
  templateId?: number;

  @ApiPropertyOptional({
    description: '模板变量 (如果使用了模板)',
    type: 'object',
    example: { code: '123456', name: '张三' },
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional({
    description: '预定发送时间 (ISO 8601 格式)',
    example: '2023-08-01T15:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
