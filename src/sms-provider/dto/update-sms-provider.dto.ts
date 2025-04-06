import {
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OnbukaConfigDto } from './create-sms-provider.dto';

export class UpdateSmsProviderDto {
  @ApiPropertyOptional({
    description: '供应商显示名称',
    example: 'Onbuka SMS服务',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'API密钥', example: 'bDqJFiq9' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'API密钥密文', example: '7bz1lzh9' })
  @IsOptional()
  @IsString()
  apiSecret?: string;

  @ApiPropertyOptional({
    description: 'API基础URL',
    example: 'https://api.onbuka.com',
  })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: '供应商特定配置', type: OnbukaConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnbukaConfigDto)
  configDetails?: OnbukaConfigDto;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
