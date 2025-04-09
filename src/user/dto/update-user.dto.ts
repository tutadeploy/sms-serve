import {
  IsString,
  MaxLength,
  IsEnum,
  IsOptional,
  IsEmail,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'new.email@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: '用户角色',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: '是否激活',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '密码 (如果需要更新)',
    example: 'newPassword123',
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: '密码长度至少为6位' })
  password?: string;

  // 通常不建议直接通过 API 修改租户 ID，如果需要，需谨慎处理
  // @ApiPropertyOptional({ description: '租户ID', example: 2 })
  // @IsOptional()
  // @IsInt()
  // tenantId?: number;
}
