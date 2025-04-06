import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class SmsReceivedMessagePageReqDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '租户ID（仅管理员可用）',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  tenantId?: number;

  @ApiPropertyOptional({
    description: '发送方手机号 (模糊查询)',
    example: '1380',
  })
  @IsOptional()
  @IsString()
  senderNumber?: string;

  @ApiPropertyOptional({
    description: '接收方手机号 (模糊查询)',
    example: '1390',
  })
  @IsOptional()
  @IsString()
  recipientNumber?: string;

  @ApiPropertyOptional({
    description: '消息内容 (模糊查询)',
    example: '验证码',
  })
  @IsOptional()
  @IsString()
  content?: string;
}
