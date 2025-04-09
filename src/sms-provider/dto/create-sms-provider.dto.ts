import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Onbuka特定配置（不再包含appId）
export class OnbukaConfigDto {
  // 可以保留其他Onbuka特定配置，但不包含appId
}

export class CreateSmsProviderDto {
  @ApiProperty({ description: '供应商唯一标识(如onbuka)', example: 'onbuka' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  // 新增租户ID字段
  @ApiProperty({ description: '关联的租户ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  tenantId!: number;

  @ApiProperty({ description: '供应商显示名称', example: 'Onbuka SMS服务' })
  @IsString()
  displayName!: string;

  @ApiProperty({ description: 'API密钥', example: 'bDqJFiq9' })
  @IsNotEmpty()
  @IsString()
  apiKey!: string;

  @ApiProperty({ description: 'API密钥密文', example: '7bz1lzh9' })
  @IsNotEmpty()
  @IsString()
  apiSecret!: string;

  @ApiPropertyOptional({
    description: 'API基础URL',
    example: 'https://api.onbuka.com',
  })
  @IsOptional()
  @IsString()
  baseUrl: string = 'https://api.onbuka.com';

  @ApiPropertyOptional({
    description: '供应商特定配置(不含appId)',
  })
  @IsOptional()
  configDetails?: Record<string, any>;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @IsBoolean()
  isActive: boolean = true;
}
