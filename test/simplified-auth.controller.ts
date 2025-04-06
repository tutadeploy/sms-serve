import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from './simplified-jwt-auth.guard';
import { AuthService } from './mock-auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger('AuthController');

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { username: string; password: string }) {
    this.logger.log(`用户登录尝试: ${loginDto.username}`);

    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    if (!user) {
      throw new BadRequestException('用户名或密码不正确');
    }

    return this.authService.login(user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    this.logger.log(`用户查看个人信息: ${req.user.username}`);
    return this.authService.getProfile(req.user);
  }
}
