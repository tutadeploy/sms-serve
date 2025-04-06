import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: '刷新令牌',
    example: 'e1b9aaf5-9a5d-4c1c-8254-35e4f7523fb9',
  })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  @IsString()
  refreshToken!: string;

  @ApiProperty({
    description: '会话ID',
    example: 'f8d9e3b7-3c6e-4a5f-9d2b-1a7c8e6f5d4c',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: '是否记住我',
    example: true,
    required: false,
  })
  @IsOptional()
  rememberMe?: boolean;
}
