import { ApiProperty } from '@nestjs/swagger';
import { TenantStatus } from '../entities/tenant.entity';

export class TenantResponseDto {
  @ApiProperty({ description: '租户ID', example: 1 })
  id!: number;

  @ApiProperty({ description: '租户名称', example: 'PNS-usps' })
  name!: string;

  @ApiProperty({ description: '租户编码', example: 'pns-usps' })
  code!: string;

  @ApiProperty({
    description: '网站地址',
    example: 'https://example.com',
    nullable: true,
  })
  website?: string | null;

  @ApiProperty({
    description: '联系邮箱',
    example: 'contact@example.com',
    nullable: true,
  })
  contactEmail?: string | null;

  @ApiProperty({
    description: '联系电话',
    example: '123-456-7890',
    nullable: true,
  })
  contactPhone?: string | null;

  @ApiProperty({
    description: 'Logo URL',
    example: 'https://logo.com/logo.png',
    nullable: true,
  })
  logoUrl?: string | null;

  @ApiProperty({
    description: '租户状态',
    enum: TenantStatus,
    example: TenantStatus.ACTIVE,
  })
  status!: TenantStatus;

  @ApiProperty({
    description: '过期日期',
    example: '2025-12-31',
    nullable: true,
  })
  expirationDate?: Date | null;

  @ApiProperty({ description: '创建时间', example: '2023-01-01T00:00:00.000Z' })
  createTime!: Date;

  @ApiProperty({ description: '更新时间', example: '2023-01-01T12:00:00.000Z' })
  updateTime!: Date;

  constructor(partial?: Partial<TenantResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
