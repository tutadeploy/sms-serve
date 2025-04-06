import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: '用户名或邮箱',
    example: 'admin@example.com',
  })
  @IsNotEmpty({ message: '用户名或邮箱不能为空' })
  @IsString()
  username!: string;

  @ApiProperty({
    description: '用户密码',
    example: 'password123',
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(6, { message: '密码长度至少为6位' })
  password!: string;

  @ApiProperty({
    description: '验证码校验成功的令牌',
    example: 'abcd1234-verification-token',
    required: false,
  })
  @IsOptional()
  @IsString()
  captchaVerification?: string;

  @ApiProperty({
    description: '租户名称',
    example: '芋道源码',
    required: false,
  })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiProperty({
    description: '客户端标识',
    example: 'web',
    required: false,
    default: 'web',
  })
  @IsOptional()
  @IsString()
  clientId: string = 'web';

  @ApiProperty({
    description: '是否记住我',
    example: true,
    required: false,
  })
  @IsOptional()
  rememberMe?: boolean;
}
