import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenant/entities/tenant.entity';

export class UserDto {
  @ApiProperty({ description: '用户ID' })
  id!: number;

  @ApiProperty({ description: '用户名' })
  username!: string;

  @ApiProperty({ description: '邮箱', required: false })
  email?: string | null;

  @ApiProperty({ description: '角色' })
  role!: string;

  @ApiProperty({ description: '是否激活' })
  isActive!: boolean;

  @ApiProperty({ description: '租户ID', required: false })
  tenantId!: number | null;

  @ApiProperty({ description: '租户信息', type: () => Tenant, required: false })
  tenant?: Tenant | null;

  @ApiProperty({ description: '创建时间' })
  createTime!: Date;

  @ApiProperty({ description: '更新时间' })
  updateTime!: Date;
}
