import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { LoginUserDto } from '../dto/login-user.dto';
import { LoginResponseDto } from '../dto/login-response.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    super({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  /**
   * 本地策略验证
   * @param request 请求对象
   * @param username 用户名
   * @param password 密码
   * @returns 登录响应
   */
  async validate(
    request: Request,
    username: string,
    password: string,
  ): Promise<LoginResponseDto> {
    if (!username || !password) {
      throw new BadRequestException('用户名和密码不能为空');
    }

    try {
      // 从请求体中获取可选的租户名称和客户端ID
      const body = request.body as Record<string, unknown>;
      const tenantName = body.tenantName as string | undefined;
      const clientId = (body.clientId as string) || 'web';

      // 创建登录DTO
      const loginDto: LoginUserDto = {
        username,
        password,
        tenantName,
        clientId,
      };

      // 调用认证服务的登录方法
      return this.authService.login(loginDto, request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      this.logger.error(`登录失败: ${errorMessage}`);

      if (err instanceof UnauthorizedException) {
        throw err;
      }

      throw new UnauthorizedException('登录失败，请检查用户名和密码');
    }
  }
}
