import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({
    description: '租户名称',
    example: 'PNS-usps',
  })
  @IsNotEmpty({ message: '租户名称不能为空' })
  @IsString()
  tenantname!: string;
}
