import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 设置用户Buka渠道配置DTO (更新)
 */
export class SetBukaUserConfigDto {
  @ApiProperty({ description: '租户名称', example: 'PNS' })
  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: 'Buka App ID', example: 'jXHi0vBY' })
  @IsString()
  @IsNotEmpty()
  appId!: string;
}
