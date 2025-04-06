import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

// 自定义验证器，用于比较密码和确认密码是否一致
@ValidatorConstraint({ name: 'isPasswordMatching', async: false })
export class IsPasswordMatchingConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    // Explicitly type constraint and object for potentially better linting
    const relatedPropertyNameUntyped = args.constraints[0] as unknown;
    const relatedPropertyName = String(relatedPropertyNameUntyped); // Expecting a string property name
    const objectRecord = args.object as Record<string, unknown>; // Type object as a record
    const relatedValue = objectRecord[relatedPropertyName];

    // Basic check to ensure properties exist and are strings before comparison
    return (
      typeof value === 'string' &&
      typeof relatedValue === 'string' &&
      value === relatedValue
    );
  }

  defaultMessage(/* args: ValidationArguments */) {
    return '密码和确认密码不匹配';
  }
}

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
    description: '电子邮箱',
    example: 'admin@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @MaxLength(100)
  email!: string;

  @ApiProperty({
    description: '密码',
    example: 'admin123',
  })
  @IsString()
  @MinLength(6, { message: '密码长度至少为6位' })
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string;

  @ApiProperty({
    description: '确认密码',
    example: 'admin123',
  })
  @IsNotEmpty({ message: '确认密码不能为空' })
  @Validate(IsPasswordMatchingConstraint, ['password'], {
    // 使用自定义验证器
    message: '密码和确认密码必须一致',
  })
  confirmPassword!: string;

  @ApiPropertyOptional({
    description: '用户角色',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: '是否为管理员',
    example: true,
    required: false,
  })
  @IsOptional()
  isAdmin?: boolean;

  @ApiPropertyOptional({
    description: '租户名称',
    example: 'yudao',
    required: false,
  })
  @IsOptional()
  @IsString()
  tenantName?: string;
}
