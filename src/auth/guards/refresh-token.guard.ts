import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SsoService } from '../../sso/sso.service';
import { Request } from 'express';

interface JwtPayload {
  sub: number;
}

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  private readonly logger = new Logger(RefreshTokenGuard.name);

  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private ssoService: SsoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = this.extractTokenFromBody(request) || '';
    const sessionId = this.extractSessionIdFromBody(request) || '';

    if (!refreshToken) {
      throw new UnauthorizedException('未提供刷新令牌');
    }

    try {
      // 验证令牌
      const decoded = this.verifyToken(refreshToken);
      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // 如果提供了会话ID，验证会话有效性
      if (sessionId) {
        const session = await this.ssoService.getSessionById(sessionId);
        if (session.userId !== decoded.sub) {
          throw new UnauthorizedException('会话与令牌不匹配');
        }
      }

      // 将用户信息附加到请求对象
      request.user = { userId: decoded.sub };
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      this.logger.warn(`刷新令牌验证失败: ${errorMessage}`);
      throw new UnauthorizedException('刷新令牌验证失败');
    }
  }

  private extractTokenFromBody(request: Request): string | undefined {
    const body = request.body as Record<string, unknown> | undefined;
    return body && typeof body === 'object'
      ? (body.refreshToken as string | undefined)
      : undefined;
  }

  private extractSessionIdFromBody(request: Request): string | undefined {
    const body = request.body as Record<string, unknown> | undefined;
    return body && typeof body === 'object'
      ? (body.sessionId as string | undefined)
      : undefined;
  }

  private verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      this.logger.warn(`令牌验证失败: ${errorMessage}`);
      throw new UnauthorizedException('无效的令牌');
    }
  }
}
