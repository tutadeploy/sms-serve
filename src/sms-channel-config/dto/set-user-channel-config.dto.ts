import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class SetUserChannelConfigDto {
  @ApiProperty({ description: '租户名称', example: 'PNS' })
  @IsNotEmpty()
  @IsString()
  tenantName: string;

  @ApiProperty({ description: '用户名', example: 'testuser' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ description: '渠道名称', example: 'smpp' })
  @IsNotEmpty()
  @IsString()
  channel: string;

  @ApiProperty({
    description: '渠道特定的用户配置详情，例如 {"appId": "user_app_id_123"}',
    example: { appId: 'user_app_id_123' },
  })
  @IsNotEmpty()
  @IsObject()
  configDetails: Record<string, any>;
}
