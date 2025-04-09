import {
  Injectable,
  /* UnauthorizedException, */ InternalServerErrorException,
  Logger, // 添加Logger
  UnauthorizedException, // 添加UnauthorizedException
} from '@nestjs/common'; // Import InternalServerErrorException
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { InjectRepository } from '@nestjs/typeorm'; // Import InjectRepository
import { Repository } from 'typeorm'; // Import Repository
import { UserToken } from '../entities/user-token.entity'; // Import UserToken

// 定义 JWT Payload 的接口
export interface JwtPayload {
  userId: number; // Keep userId for backwards compatibility / user lookup
  sub: number; // Standard JWT subject claim (usually user ID)
  username: string;
  roles?: string[];
  iat?: number;
  exp?: number;
  tenantId?: number | null;
  clientId?: string; // Add clientId if needed from payload
  jti: string; // JWT ID claim, linked to UserToken's refreshToken
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private userService: UserService,
    @InjectRepository(UserToken) // Inject UserToken Repository
    private tokenRepository: Repository<UserToken>,
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
    const { sub: userId, jti } = payload;

    this.logger.debug(
      `Validating JWT payload for user: ${userId}, jti: ${jti}`,
    );

    try {
      // 1. Check if the token itself is revoked using jti (linked to refreshToken)
      const tokenRecord = await this.tokenRepository.findOne({
        where: { refreshToken: jti, isRevoked: false },
      });

      if (!tokenRecord) {
        this.logger.warn(
          `Token validation failed: Token with jti ${jti} not found or revoked.`,
        );
        throw new UnauthorizedException('令牌无效或已被撤销');
      }

      // 2. Check if the user exists and is active (redundant check but good practice)
      const user = await this.userService.findOne(userId);

      if (!user || !user.isActive) {
        this.logger.warn(
          `Token validation failed: User ${userId} not found or inactive.`,
        );
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      // Attach necessary user info to the request object
      return {
        sub: user.id,
        userId: user.id, // 确保返回 userId
        username: user.username,
        roles: user.role ? [user.role] : [],
        tenantId: user.tenantId,
        clientId: payload.clientId,
        jti: payload.jti,
      };
    } catch (error: unknown) {
      this.logger.error(
        `JWT validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('无效的令牌');
    }
  }
}
