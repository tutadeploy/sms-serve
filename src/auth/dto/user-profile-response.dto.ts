import { ApiProperty } from '@nestjs/swagger';

export class UserProfileResponseDto {
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
    description: '用户角色列表',
    type: 'array',
    items: {
      type: 'string',
    },
    example: ['admin', 'user'],
  })
  roles: string[];

  @ApiProperty({
    description: '所属租户ID',
    example: 1,
    required: false,
  })
  tenantId?: number;
}
