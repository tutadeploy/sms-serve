import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 设置租户渠道配置DTO
 */
export class SetChannelDto {
  @ApiProperty({ description: '渠道标识', example: 'buka' })
  @IsString()
  @IsNotEmpty()
  channel!: string;

  @ApiProperty({ description: 'API Key', example: 'your-api-key' })
  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @ApiProperty({ description: 'API Secret', example: 'your-api-secret' })
  @IsString()
  @IsNotEmpty()
  apiSecret!: string;

  @ApiProperty({
    description: '可选的API基础URL',
    required: false,
    example: 'https://api.example.com',
  })
  @IsString()
  @IsOptional()
  baseUrl?: string;
}
