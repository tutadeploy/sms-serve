import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Onbuka特定配置
export class OnbukaConfigDto {
  @ApiProperty({ description: 'Onbuka应用ID', example: '41uaKsL2' })
  @IsNotEmpty()
  @IsString()
  appid!: string;
}

export class CreateSmsProviderDto {
  @ApiProperty({ description: '供应商唯一标识(如onbuka)', example: 'onbuka' })
  @IsNotEmpty()
  @IsString()
  name!: string;

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

  @ApiProperty({ description: '供应商特定配置', type: OnbukaConfigDto })
  @ValidateNested()
  @Type(() => OnbukaConfigDto)
  configDetails!: OnbukaConfigDto;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @IsBoolean()
  isActive: boolean = true;
}
