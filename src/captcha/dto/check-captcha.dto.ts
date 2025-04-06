import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CaptchaType } from './get-captcha.dto';

export class CheckCaptchaDto {
  @ApiProperty({
    description: '验证码类型',
    enum: CaptchaType,
    example: CaptchaType.BLOCK_PUZZLE,
  })
  @IsNotEmpty({ message: '验证码类型不能为空' })
  @IsEnum(CaptchaType, { message: '验证码类型只能是blockPuzzle或clickWord' })
  captchaType: CaptchaType = CaptchaType.BLOCK_PUZZLE;

  @ApiProperty({
    description: '用户操作的坐标JSON',
    example: '{"x": 120, "y": 5.0}',
  })
  @IsNotEmpty({ message: '坐标信息不能为空' })
  @IsString()
  pointJson: string = '';

  @ApiProperty({
    description: '验证码会话token',
    example: 'a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
  })
  @IsNotEmpty({ message: '验证码token不能为空' })
  @IsString()
  token: string = '';
}
