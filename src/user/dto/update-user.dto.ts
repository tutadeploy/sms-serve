import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: '用户邮箱',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: '请提供有效的电子邮件地址' })
  email?: string;

  @ApiProperty({
    description: '用户密码',
    required: false,
    minLength: 6,
  })
  @IsOptional()
  @MinLength(6, { message: '密码长度不能少于6个字符' })
  password?: string;

  @ApiProperty({
    description: '用户状态',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive必须是一个布尔值' })
  isActive?: boolean;
}
