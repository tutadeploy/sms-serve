import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: '令牌ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: '刷新令牌',
    example: 'a762fdf8-d3cc-4e1c-a6f3-88194e6b30f9',
  })
  refreshToken!: string;

  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  userId!: number;

  @ApiProperty({
    description: '用户类型',
    example: 1,
    default: 1,
  })
  userType: number = 1;

  @ApiProperty({
    description: '客户端ID',
    example: 'web',
  })
  clientId!: string;

  @ApiProperty({
    description: '过期时间(Unix时间戳)',
    example: 1609459200,
  })
  expiresTime!: number;

  @ApiProperty({
    description: '会话ID',
    example: 'a762fdf8-d3cc-4e1c-a6f3-88194e6b30f9',
    required: false,
  })
  sessionId?: string;

  @ApiProperty({
    description: '租户ID',
    example: 1,
    required: false,
    nullable: true,
  })
  tenantId?: number | null;
}
