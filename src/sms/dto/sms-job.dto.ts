import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

/**
 * 短信处理作业的数据传输对象
 * 用于在队列中传递SMS作业数据
 */
export class SmsJobDto {
  @ApiProperty({
    description: '短信批次ID',
    example: 1,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  batchId!: number;

  @ApiProperty({
    description: '短信消息ID',
    example: 100,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  messageId!: number;

  @ApiProperty({
    description: '短信提供商ID',
    example: 1,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  provider!: number;

  @ApiProperty({
    description: '短信接收者的手机号码',
    example: '+8613800138000',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  recipient!: string;

  @ApiProperty({
    description: '短信内容',
    example: '您的验证码是：123456，5分钟内有效。',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  constructor(partial?: Partial<SmsJobDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
