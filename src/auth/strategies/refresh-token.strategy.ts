import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './jwt.strategy';
import { UserService } from '../../user/user.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  private readonly logger = new Logger(RefreshTokenStrategy.name);

  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    const refreshTokenSecret = configService.get<string>(
      'JWT_REFRESH_TOKEN_SECRET',
    );

    if (!refreshTokenSecret) {
      throw new InternalServerErrorException(
        'JWT_REFRESH_TOKEN_SECRET 未在环境变量中配置',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: refreshTokenSecret,
    });

    this.logger.log('刷新令牌策略已初始化');
  }

  /**
   * 验证刷新令牌的JWT载荷
   * @param payload JWT令牌载荷
   * @returns 验证通过的用户信息
   */
  async validate(payload: JwtPayload) {
    const { userId } = payload;

    try {
      const user = await this.userService.findOne(userId);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      // 返回用户信息，将被Passport添加到请求对象中
      return {
        userId: user.id,
        username: user.username,
        roles: user.role ? [user.role] : [],
      };
    } catch (error) {
      this.logger.error(
        `刷新令牌验证失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('无效的刷新令牌');
    }
  }
}
