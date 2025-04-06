import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CaptchaService } from './captcha.service';
import { CheckCaptchaDto, GetCaptchaDto } from './dto';
import { CaptchaResult } from './interfaces';

@ApiTags('验证码')
@Controller('system/captcha')
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Post('get')
  @ApiOperation({ summary: '获取验证码' })
  @ApiBody({ type: GetCaptchaDto })
  @ApiResponse({
    status: 200,
    description: '成功获取验证码',
  })
  async getCaptcha(
    @Body() getCaptchaDto: GetCaptchaDto,
  ): Promise<CaptchaResult> {
    return this.captchaService.generateCaptcha(getCaptchaDto.captchaType);
  }

  @Post('check')
  @ApiOperation({ summary: '校验验证码' })
  @ApiBody({ type: CheckCaptchaDto })
  @ApiResponse({
    status: 200,
    description: '验证码校验结果',
  })
  async checkCaptcha(
    @Body() checkCaptchaDto: CheckCaptchaDto,
  ): Promise<CaptchaResult> {
    return this.captchaService.verifyCaptcha(
      checkCaptchaDto.captchaType,
      checkCaptchaDto.token,
      checkCaptchaDto.pointJson,
    );
  }
}
