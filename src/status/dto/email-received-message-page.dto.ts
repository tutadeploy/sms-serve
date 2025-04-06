import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ReceivedEmailType } from '../../email-received-message/entities/email-received-message.entity';

export class EmailReceivedMessagePageReqDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '租户ID（仅管理员可用）',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  tenantId?: number;

  @ApiPropertyOptional({
    description: '发送方邮箱 (模糊查询)',
    example: 'sender@example.com',
  })
  @IsOptional()
  @IsString()
  senderEmail?: string;

  @ApiPropertyOptional({
    description: '接收方邮箱 (模糊查询)',
    example: 'receiver@example.com',
  })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiPropertyOptional({
    description: '邮件主题 (模糊查询)',
    example: '验证码',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: '邮件类型',
    enum: ReceivedEmailType,
    example: ReceivedEmailType.INBOUND,
  })
  @IsOptional()
  @IsEnum(ReceivedEmailType)
  type?: ReceivedEmailType;
}
