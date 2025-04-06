import {
  Injectable,
  /* UnauthorizedException, */ InternalServerErrorException,
  Logger, // 添加Logger
  UnauthorizedException, // 添加UnauthorizedException
} from '@nestjs/common'; // Import InternalServerErrorException
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service'; // 可能需要用于验证用户是否存在或状态
import { UserService } from '../../user/user.service';

// 定义 JWT Payload 的接口
export interface JwtPayload {
  userId: number;
  username: string;
  roles?: string[];
  iat?: number;
  exp?: number;
  tenantId?: number | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService, // 注入 AuthService (可选，但通常有用)
    private userService: UserService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET', 'supersecret');
    if (!jwtSecret) {
      // 在配置加载阶段就失败比运行时失败更好
      throw new InternalServerErrorException('JWT_SECRET 未在环境变量中配置');
    }

    // 添加详细日志记录JWT策略初始化
    const extractorFunction = ExtractJwt.fromAuthHeaderAsBearerToken();

    super({
      jwtFromRequest: (req) => {
        const token = extractorFunction(req);
        this.logger.debug(
          `提取的JWT令牌: ${token ? token.substring(0, 20) + '...' : 'null'}`,
        );
        if (!token) {
          this.logger.error('JWT令牌提取失败，请检查Authorization头部');
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // 使用已验证存在的密钥
    });

    this.logger.log(
      'JWT策略已初始化，使用的密钥：' + jwtSecret.substring(0, 3) + '...',
    );
  }

  /**
   * 验证JWT令牌的载荷
   * @param payload JWT令牌载荷
   * @returns 验证通过的用户信息
   */
  async validate(payload: JwtPayload) {
    const { userId } = payload;

    try {
      const user = await this.userService.findById(userId);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      // 返回用户信息，将被Passport添加到请求对象中
      return {
        userId: user.id,
        username: user.username,
        roles: user.role ? [user.role] : [],
        tenantId: user.tenantId,
      };
    } catch (error: unknown) {
      this.logger.error(
        `JWT验证失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('无效的令牌');
    }
  }
}
