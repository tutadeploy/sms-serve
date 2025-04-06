import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SsoSession } from './entities/sso-session.entity';
import { UserToken } from '../auth/entities/user-token.entity';
import { Request } from 'express';

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    @InjectRepository(SsoSession)
    private readonly sessionRepository: Repository<SsoSession>,
    @InjectRepository(UserToken)
    private readonly tokenRepository: Repository<UserToken>,
  ) {}

  /**
   * 创建新的单点登录会话
   */
  async createSession(
    userId: number,
    tokenId: number,
    tenantId: number | null,
    request: Request,
    sessionDurationMinutes: number = 720, // 默认12小时
  ): Promise<SsoSession> {
    // 生成会话ID
    const sessionId = uuidv4();

    // 获取客户端信息
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + sessionDurationMinutes);

    // 创建会话记录
    const session = this.sessionRepository.create({
      userId,
      tenantId,
      tokenId,
      sessionId,
      ipAddress,
      userAgent,
      expiresAt,
      isActive: true,
    });

    return this.sessionRepository.save(session);
  }

  /**
   * 验证会话有效性
   */
  async validateSession(sessionId: string): Promise<SsoSession> {
    const session = await this.sessionRepository.findOne({
      where: {
        sessionId,
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      relations: ['user', 'tenant'],
    });

    if (!session) {
      throw new UnauthorizedException('会话无效或已过期');
    }

    // 更新最后活动时间
    session.lastActivityAt = new Date();
    await this.sessionRepository.save(session);

    return session;
  }

  /**
   * 注销会话
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    const result = await this.sessionRepository.update(
      { sessionId },
      { isActive: false },
    );

    return Boolean(result.affected);
  }

  /**
   * 注销用户的所有会话
   */
  async invalidateAllUserSessions(userId: number): Promise<number> {
    const result = await this.sessionRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );

    return result.affected || 0;
  }

  /**
   * 注销与特定令牌关联的会话
   */
  async invalidateTokenSessions(
    userId: number,
    jwtId?: string,
  ): Promise<number> {
    const whereCondition: {
      userId: number;
      tokenId?: number;
      isActive: boolean;
    } = {
      userId,
      isActive: true,
    };

    // 如果有JWT ID，查找对应的令牌记录
    if (jwtId) {
      // 使用createQueryBuilder执行自定义查询来找到有该jwtId的令牌
      const token = await this.tokenRepository
        .createQueryBuilder('token')
        .where('token.jwtId = :jwtId', { jwtId })
        .getOne();

      if (token) {
        whereCondition.tokenId = token.id;
      }
    }

    const result = await this.sessionRepository.update(whereCondition, {
      isActive: false,
    });

    return result.affected || 0;
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await this.sessionRepository.update(
      { expiresAt: LessThan(now), isActive: true },
      { isActive: false },
    );

    this.logger.log(`已清理 ${result.affected || 0} 个过期会话`);
    return result.affected || 0;
  }

  /**
   * 获取用户活跃会话列表
   */
  async getUserActiveSessions(userId: number): Promise<SsoSession[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      order: { lastActivityAt: 'DESC' },
    });
  }

  /**
   * 根据会话ID获取会话
   */
  async getSessionById(sessionId: string): Promise<SsoSession> {
    const session = await this.sessionRepository.findOne({
      where: { sessionId },
      relations: ['user', 'tenant'],
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return session;
  }

  /**
   * 延长会话有效期
   */
  async extendSession(
    sessionId: string,
    durationMinutes: number = 720,
  ): Promise<SsoSession> {
    const session = await this.getSessionById(sessionId);

    if (!session.isActive) {
      throw new UnauthorizedException('会话已经失效');
    }

    // 计算新的过期时间
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + durationMinutes);

    session.expiresAt = newExpiresAt;
    session.lastActivityAt = new Date();

    return this.sessionRepository.save(session);
  }
}
