import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  @MinLength(3, { message: '用户名长度至少为3位' })
  @MaxLength(50, { message: '用户名长度不能超过50位' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '用户名只能包含字母、数字和下划线',
  })
  username!: string;

  @ApiProperty({
    description: '密码',
    example: 'admin123',
  })
  @IsString()
  @MinLength(6, { message: '密码长度至少为6位' })
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string;

  @ApiProperty({
    description: '租户名称',
    example: 'PNS',
  })
  @IsNotEmpty({ message: '租户名称不能为空' })
  @IsString()
  tenantname!: string;

  @ApiProperty({
    description: '用户角色',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsNotEmpty({ message: '用户角色不能为空' })
  @IsEnum(UserRole)
  role!: UserRole;
}
