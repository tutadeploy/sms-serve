import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

/**
 * 用户权限DTO
 */
export class UserPermissionDto {
  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: '用户名',
    example: 'admin',
  })
  username: string;

  @ApiProperty({
    description: '用户角色',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  role: UserRole;

  @ApiProperty({
    description: '租户ID',
    example: 1,
    nullable: true,
  })
  tenantId: number | null;

  @ApiProperty({
    description: '租户名称',
    example: 'PNS',
    nullable: true,
  })
  tenantName: string | null;

  @ApiProperty({
    description: '权限列表',
    type: [String],
    example: ['user:create', 'user:read', 'tenant:read'],
  })
  permissions: string[];
}

/**
 * 权限响应DTO
 */
export class PermissionResponseDto {
  @ApiProperty({
    description: '状态码',
    example: 0,
  })
  code: number;

  @ApiProperty({
    description: '状态信息',
    example: 'success',
  })
  message: string;

  @ApiProperty({
    description: '数据',
    type: UserPermissionDto,
  })
  data: UserPermissionDto;
}
