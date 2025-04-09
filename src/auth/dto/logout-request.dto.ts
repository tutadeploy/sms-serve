import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LogoutRequestDto {
  @ApiProperty({
    description: '需要撤销的刷新令牌',
    example: 'a762fdf8-d3cc-4e1c-a6f3-88194e6b30f9',
  })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  @IsString({ message: '刷新令牌必须是字符串' })
  refreshToken: string;

  @ApiProperty({
    description: '可选的会话ID，用于多端登录场景',
    example: 'session-123456',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '会话ID必须是字符串' })
  sessionId?: string;
}
