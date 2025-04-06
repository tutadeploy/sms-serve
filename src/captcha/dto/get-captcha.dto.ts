import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum CaptchaType {
  BLOCK_PUZZLE = 'blockPuzzle',
  CLICK_WORD = 'clickWord',
}

export class GetCaptchaDto {
  @ApiProperty({
    description: '验证码类型',
    enum: CaptchaType,
    example: CaptchaType.BLOCK_PUZZLE,
  })
  @IsNotEmpty({ message: '验证码类型不能为空' })
  @IsEnum(CaptchaType, { message: '验证码类型只能是blockPuzzle或clickWord' })
  captchaType: CaptchaType = CaptchaType.BLOCK_PUZZLE;
}
