import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../user/entities/user.entity';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserToken } from './entities/user-token.entity';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TenantService } from '../tenant/tenant.service';
import { SsoService } from '../sso/sso.service';
import { PermissionInfoResponseDto } from './dto/permission-info.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserToken)
    private tokenRepository: Repository<UserToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private tenantService: TenantService,
    private ssoService: SsoService,
  ) {}

  /**
   * 用户登录
   */
  async login(
    loginUserDto: LoginUserDto,
    req: Request,
  ): Promise<LoginResponseDto> {
    const {
      username,
      password,
      clientId = 'web',
      tenantName,
      captchaVerification,
      rememberMe,
    } = loginUserDto;

    // 验证验证码（如果提供了验证码校验令牌）
    if (captchaVerification) {
      // 这里可以添加验证码校验逻辑，如有需要
      // 例如：await this.captchaService.verifyCaptchaToken(captchaVerification);
      this.logger.log(`验证码校验令牌: ${captchaVerification}`);
    }

    // 查找用户 - 需要特别选择password_hash
    let whereConditions: FindOptionsWhere<User>[] = [
      { username },
      { email: username },
    ];

    let tenantId: number | null = null;

    // 如果提供了租户名称，获取租户ID
    if (tenantName) {
      try {
        const tenant = await this.tenantService.findByName(tenantName);
        tenantId = tenant.id;
        // 添加租户ID作为查询条件
        whereConditions = whereConditions.map((cond) => ({
          ...cond,
          tenantId,
        })) as FindOptionsWhere<User>[];
      } catch {
        // 记录并抛出异常，但不使用错误对象
        this.logger.warn(`找不到租户: ${tenantName}`);
        throw new NotFoundException(`找不到租户: ${tenantName}`);
      }
    }

    // 查找用户
    const user = await this.userRepository.findOne({
      where: whereConditions,
      select: [
        'id',
        'username',
        'email',
        'passwordHash',
        'isActive',
        'role',
        'tenantId',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成令牌
    const tokenData = await this.createToken(user, clientId, req, rememberMe);

    // 如果用户未指定租户但有关联租户，记录这个关联
    if (!tenantName && user.tenantId) {
      tenantId = user.tenantId;
    }

    // 创建SSO会话
    const ssoSession = await this.ssoService.createSession(
      user.id,
      tokenData.id,
      tenantId,
      req,
    );

    // 返回登录响应
    return {
      id: tokenData.id,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      userId: user.id,
      userType: 1, // 固定值，可以根据业务修改
      clientId: clientId,
      expiresTime: Math.floor(tokenData.accessTokenExpiresAt.getTime() / 1000),
      sessionId: ssoSession.sessionId,
      tenantId,
    };
  }

  /**
   * 创建令牌
   */
  private async createToken(
    user: User,
    clientId: string,
    req: Request,
    rememberMe?: boolean,
  ): Promise<UserToken> {
    // 获取配置的过期时间
    const accessTokenExpiresInSeconds = this.configService.get<number>(
      'JWT_EXPIRATION_TIME',
      3600,
    ); // 默认1小时
    let refreshTokenExpiresInDays = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRATION_DAYS',
      7,
    ); // 默认7天

    // 如果用户选择了"记住我"，则延长刷新令牌的有效期
    if (rememberMe) {
      refreshTokenExpiresInDays = this.configService.get<number>(
        'REMEMBER_ME_EXPIRATION_DAYS',
        30,
      ); // 记住我状态下默认30天
      this.logger.log(
        `用户选择了记住我，延长令牌有效期至${refreshTokenExpiresInDays}天`,
      );
    }

    // 计算过期时间
    const now = new Date();
    const accessTokenExpiresAt = new Date(
      now.getTime() + accessTokenExpiresInSeconds * 1000,
    );
    const refreshTokenExpiresAt = new Date(
      now.getTime() + refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    );

    // 创建JWT负载
    const payload = {
      sub: user.id,
      username: user.username,
      roles: [user.role],
      tenantId: user.tenantId,
      clientId,
    };

    // 签发JWT令牌
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${accessTokenExpiresInSeconds}s`,
    });

    // 生成刷新令牌
    const refreshToken = uuidv4();

    // 获取客户端信息
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const deviceInfo = {
      userAgent,
      ipAddress,
      platform: req.headers['sec-ch-ua-platform'] || 'unknown',
    };

    // 创建令牌记录
    const tokenEntity = this.tokenRepository.create({
      userId: user.id,
      tenantId: user.tenantId,
      accessToken,
      refreshToken,
      clientId,
      userType: 1, // 固定值，可以根据业务修改
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      isRevoked: false,
      deviceInfo,
      ipAddress,
    });

    // 保存令牌
    return this.tokenRepository.save(tokenEntity);
  }

  /**
   * 刷新令牌
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    req?: Request,
  ): Promise<LoginResponseDto> {
    const { refreshToken, sessionId, rememberMe } = refreshTokenDto;

    // 查找有效的刷新令牌
    const tokenEntity = await this.tokenRepository.findOne({
      where: {
        refreshToken,
        isRevoked: false,
        refreshTokenExpiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!tokenEntity || !tokenEntity.user) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    // 如果提供了会话ID，需要验证会话有效性
    if (sessionId) {
      try {
        // 验证会话是否有效且属于此用户
        const session = await this.ssoService.getSessionById(sessionId);
        if (session.userId !== tokenEntity.userId || !session.isActive) {
          throw new UnauthorizedException('会话无效或已过期');
        }
      } catch {
        this.logger.warn(`会话验证失败: ${sessionId}`);
        throw new UnauthorizedException('会话验证失败');
      }
    }

    // 撤销旧令牌
    tokenEntity.isRevoked = true;
    await this.tokenRepository.save(tokenEntity);

    // 创建新令牌
    const newTokenData = await this.createToken(
      tokenEntity.user,
      tokenEntity.clientId,
      req || ({} as Request), // 提供一个兼容的空请求对象
      rememberMe,
    );

    // 如果有会话ID，延长会话
    let newSessionId = sessionId;
    if (sessionId) {
      try {
        // 创建与新令牌关联的会话
        const extendedSession = await this.ssoService.extendSession(sessionId);
        newSessionId = extendedSession.sessionId;
      } catch (err) {
        // 如果会话延长失败，创建新会话
        this.logger.warn(
          `延长会话失败，创建新会话: ${err instanceof Error ? err.message : '未知错误'}`,
        );
        const newSession = await this.ssoService.createSession(
          tokenEntity.userId,
          newTokenData.id,
          tokenEntity.tenantId,
          req || ({} as Request), // 提供一个兼容的空请求对象
        );
        newSessionId = newSession.sessionId;
      }
    }

    // 返回刷新的令牌信息
    return {
      id: newTokenData.id,
      accessToken: newTokenData.accessToken,
      refreshToken: newTokenData.refreshToken,
      userId: tokenEntity.userId,
      userType: tokenEntity.userType,
      clientId: tokenEntity.clientId,
      expiresTime: Math.floor(
        newTokenData.accessTokenExpiresAt.getTime() / 1000,
      ),
      sessionId: newSessionId,
      tenantId: tokenEntity.tenantId,
    };
  }

  /**
   * 注销登录
   */
  async logout(
    userId: number,
    refreshToken: string,
    sessionId?: string,
  ): Promise<boolean> {
    // 撤销刷新令牌
    const updateResult = await this.tokenRepository.update(
      { userId, refreshToken, isRevoked: false },
      { isRevoked: true },
    );

    // 如果提供了会话ID，注销会话
    if (sessionId) {
      try {
        await this.ssoService.invalidateSession(sessionId);
      } catch {
        this.logger.warn(`注销会话失败: ${sessionId}`);
      }
    }

    // 返回操作结果
    return Boolean(updateResult.affected);
  }

  /**
   * 获取用户权限信息
   */
  async getPermissionInfo(
    userId: number,
    tenantId?: number,
  ): Promise<PermissionInfoResponseDto> {
    // 查找用户
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'email', 'role', 'tenantId'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证租户
    if (tenantId !== undefined) {
      if (typeof user.tenantId === 'number' && typeof tenantId === 'number') {
        if (user.tenantId !== tenantId) {
          throw new UnauthorizedException('用户不属于指定租户');
        }
      } else {
        const userTenantIdStr =
          user.tenantId === null ? null : String(user.tenantId);
        const tenantIdStr = String(tenantId);
        if (userTenantIdStr !== tenantIdStr) {
          throw new UnauthorizedException('用户不属于指定租户');
        }
      }
    }

    // 获取角色和权限
    const roles = [user.role];
    const permissions =
      user.role === UserRole.ADMIN ? ['*:*:*'] : ['system:sms:template:query'];

    // 构建菜单树
    const menus = [
      {
        id: 1,
        name: '短信管理',
        path: '/sms',
        component: 'Layout',
        componentName: 'Sms',
        icon: 'ep:message',
        parentId: 0,
        visible: true,
        keepAlive: true,
        alwaysShow: true,
        children: [
          {
            id: 2,
            name: '短信模板',
            path: 'template',
            component: 'sms/template/index.vue',
            componentName: 'SmsTemplate',
            icon: 'ep:document',
            parentId: 1,
            visible: true,
            keepAlive: true,
          },
          {
            id: 3,
            name: '发送短信',
            path: 'send',
            component: 'sms/send/index.vue',
            componentName: 'SmsSend',
            icon: 'ep:message',
            parentId: 1,
            visible: true,
            keepAlive: true,
          },
          {
            id: 4,
            name: '发送队列',
            path: 'queue',
            component: 'sms/queue/index.vue',
            componentName: 'SmsQueue',
            icon: 'ep:list',
            parentId: 1,
            visible: true,
            keepAlive: true,
          },
          {
            id: 5,
            name: '发送记录',
            path: 'send-log',
            component: 'sms/send-log/index.vue',
            componentName: 'SmsSendLog',
            icon: 'ep:document',
            parentId: 1,
            visible: true,
            keepAlive: true,
          },
          {
            id: 6,
            name: '接收记录',
            path: 'receive-log',
            component: 'sms/receive-log/index.vue',
            componentName: 'SmsReceiveLog',
            icon: 'ep:document',
            parentId: 1,
            visible: true,
            keepAlive: true,
          },
        ],
      },
    ];

    // 返回符合规范的权限信息
    return {
      user: {
        id: user.id,
        nickname: user.username,
        avatar: 'https://example.com/default-avatar.png',
        deptId: null,
      },
      roles,
      permissions,
      menus,
    };
  }
}
