import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../entities/user-token.entity';
import { JwtPayload } from '../strategies/jwt.strategy';
import { User } from '../../user/entities/user.entity';
import {
  BusinessException,
  BusinessErrorCode,
} from '../../common/exceptions/business.exception';

@Injectable()
export class UserTokenService {
  private readonly logger = new Logger(UserTokenService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(UserToken)
    private userTokenRepository: Repository<UserToken>,
  ) {}

  /**
   * 生成访问令牌和刷新令牌
   * @param user 用户对象
   * @param clientId 客户端标识
   */
  generateTokens(
    user: User,
    clientId: string = 'web',
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  }> {
    return new Promise((resolve) => {
      const payload: JwtPayload = {
        userId: user.id,
        username: user.username,
        roles: user.roles,
        tenantId: user.tenantId || 0,
      };

      // 获取过期时间配置
      const accessTokenExpiresIn = parseInt(
        this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '3600'),
      );
      const refreshTokenExpiresIn = parseInt(
        this.configService.get<string>(
          'JWT_REFRESH_TOKEN_EXPIRES_IN',
          '604800',
        ),
      );

      // 计算过期时间
      const now = new Date();
      const accessTokenExpiresAt = new Date(
        now.getTime() + accessTokenExpiresIn * 1000,
      );
      const refreshTokenExpiresAt = new Date(
        now.getTime() + refreshTokenExpiresIn * 1000,
      );

      // 生成JWT令牌
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: accessTokenExpiresIn,
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: refreshTokenExpiresIn,
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });

      this.logger.log(
        `为用户 ${user.username} 生成新的访问令牌和刷新令牌，客户端: ${clientId}`,
      );

      resolve({
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      });
    });
  }

  /**
   * 保存用户令牌到数据库
   */
  async saveUserToken(
    userId: number,
    accessToken: string,
    refreshToken: string,
    clientId: string,
    accessTokenExpiresAt: Date,
    refreshTokenExpiresAt: Date,
    userType: string = 'admin',
  ): Promise<UserToken> {
    try {
      // 查找是否已存在相同用户和客户端的令牌
      const existingToken = await this.userTokenRepository.findOne({
        where: {
          userId,
          clientId,
        },
      });

      if (existingToken) {
        // 更新现有令牌
        existingToken.accessToken = accessToken;
        existingToken.refreshToken = refreshToken;
        existingToken.accessTokenExpiresAt = accessTokenExpiresAt;
        existingToken.refreshTokenExpiresAt = refreshTokenExpiresAt;
        existingToken.isRevoked = false;
        return this.userTokenRepository.save(existingToken);
      } else {
        // 创建新令牌记录
        const userToken = new UserToken();
        userToken.userId = userId;
        userToken.accessToken = accessToken;
        userToken.refreshToken = refreshToken;
        userToken.clientId = clientId;
        userToken.userType = Number(userType) || 1;
        userToken.accessTokenExpiresAt = accessTokenExpiresAt;
        userToken.refreshTokenExpiresAt = refreshTokenExpiresAt;
        return this.userTokenRepository.save(userToken);
      }
    } catch (error) {
      this.logger.error(
        `保存用户令牌失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BusinessException(
        '保存用户令牌失败',
        BusinessErrorCode.GENERAL_ERROR,
      );
    }
  }

  /**
   * 根据刷新令牌查找用户令牌
   */
  async findByRefreshToken(refreshToken: string): Promise<UserToken> {
    const userToken = await this.userTokenRepository.findOne({
      where: { refreshToken },
    });

    if (!userToken) {
      throw new BusinessException(
        '刷新令牌无效或已过期',
        BusinessErrorCode.GENERAL_ERROR,
      );
    }

    // 验证刷新令牌是否有效
    if (!userToken.isRefreshValid()) {
      throw new BusinessException(
        '刷新令牌已失效',
        BusinessErrorCode.GENERAL_ERROR,
      );
    }

    return userToken;
  }

  /**
   * 撤销用户的所有令牌
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.userTokenRepository.update({ userId }, { isRevoked: true });
    this.logger.log(`已撤销用户 ID: ${userId} 的所有令牌`);
  }

  /**
   * 撤销特定用户令牌
   */
  async revokeToken(tokenId: number): Promise<void> {
    await this.userTokenRepository.update({ id: tokenId }, { isRevoked: true });
    this.logger.log(`已撤销令牌 ID: ${tokenId}`);
  }

  /**
   * 根据用户ID和客户端ID获取令牌
   */
  async findByUserAndClient(
    userId: number,
    clientId: string,
  ): Promise<UserToken | null> {
    return this.userTokenRepository.findOne({
      where: {
        userId,
        clientId,
      },
    });
  }
}
