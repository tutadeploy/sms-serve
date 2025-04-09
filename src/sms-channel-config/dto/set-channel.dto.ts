import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ConfigDetailsDto {
  @ApiProperty({ description: '服务商基础URL（可选）', required: false })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiProperty({ description: '服务商APP ID（可选）', required: false })
  @IsString()
  @IsOptional()
  appId?: string;

  // 可以添加其他特定字段
}

/**
 * 设置租户渠道配置DTO
 */
export class SetChannelDto {
  @ApiProperty({ description: '渠道名称，如 buka', required: true })
  @IsString()
  @IsNotEmpty()
  channel: string;

  @ApiProperty({ description: 'API密钥', required: true })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({ description: 'API密钥密文', required: true })
  @IsString()
  @IsNotEmpty()
  apiSecret: string;

  @ApiProperty({
    description: '额外配置信息',
    required: false,
    type: ConfigDetailsDto,
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigDetailsDto)
  configDetails?: ConfigDetailsDto;
}
