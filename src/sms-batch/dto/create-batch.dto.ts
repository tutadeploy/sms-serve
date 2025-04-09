import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 创建批次的数据传输对象
 */
export class CreateBatchDto {
  @ApiProperty({
    description: '租户ID',
    example: 1,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  tenantId: number;

  @ApiProperty({
    description: '用户ID',
    example: 1,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: '渠道类型，如 "onbuka"',
    example: 'onbuka',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  channel: string;

  @ApiProperty({
    description: '短信内容',
    example: '您的验证码是：123456，请在5分钟内使用。',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({
    description: '接收者手机号码列表',
    example: ['13800138000', '13800138001'],
    type: [String],
    required: true,
  })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];
}
