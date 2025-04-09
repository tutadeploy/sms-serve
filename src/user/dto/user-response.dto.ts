import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';
import { Role } from '../../auth/entities/role.entity';

export class UserResponseDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id!: number;

  @ApiProperty({ description: '用户名', example: 'admin' })
  username!: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
    nullable: true,
  })
  email?: string;

  @ApiProperty({
    description: '用户角色',
    enum: UserRole,
    example: UserRole.USER,
  })
  role!: UserRole;

  @ApiProperty({ description: '是否激活', example: true })
  isActive!: boolean;

  @ApiProperty({ description: '租户ID', example: 1, nullable: true })
  tenantId!: number | null;

  @ApiProperty({ description: '角色列表', type: [Role], required: false })
  roles?: Role[];

  @ApiProperty({ description: '创建时间', example: '2023-01-01T00:00:00.000Z' })
  createTime!: Date;

  @ApiProperty({ description: '更新时间', example: '2023-01-01T12:00:00.000Z' })
  updateTime!: Date;
}
