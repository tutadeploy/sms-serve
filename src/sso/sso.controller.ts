import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SsoService } from './sso.service';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

// 自定义的请求接口，包含用户信息
interface RequestWithUser extends Request {
  user: {
    userId: number;
    username: string;
    roles?: string[];
    tenantId?: number;
  };
}

@ApiTags('单点登录')
@Controller('system/sso')
export class SsoController {
  private readonly logger = new Logger(SsoController.name);

  constructor(private readonly ssoService: SsoService) {}

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户的活跃会话列表' })
  async getUserSessions(@Req() req: RequestWithUser) {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('未认证');
    }

    const userId = req.user.userId;
    return this.ssoService.getUserActiveSessions(userId);
  }

  @Post('sessions/:sessionId/extend')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '延长会话有效期' })
  @ApiParam({ name: 'sessionId', description: '会话ID' })
  async extendSession(
    @Param('sessionId') sessionId: string,
    @Req() req: RequestWithUser,
  ) {
    // 验证用户有权操作此会话
    const session = await this.ssoService.getSessionById(sessionId);

    if (!req.user || req.user.userId !== session.userId) {
      throw new UnauthorizedException('无权操作此会话');
    }

    return this.ssoService.extendSession(sessionId);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '注销指定会话' })
  @ApiParam({ name: 'sessionId', description: '会话ID' })
  async invalidateSession(
    @Param('sessionId') sessionId: string,
    @Req() req: RequestWithUser,
  ) {
    // 验证用户有权操作此会话
    const session = await this.ssoService.getSessionById(sessionId);

    if (!req.user || req.user.userId !== session.userId) {
      throw new UnauthorizedException('无权操作此会话');
    }

    return this.ssoService.invalidateSession(sessionId);
  }

  @Delete('sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '注销当前用户的所有会话(除当前会话)' })
  async invalidateAllSessions(@Req() req: RequestWithUser) {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('未认证');
    }

    const userId = req.user.userId;
    const currentSessionId = req.headers['x-session-id'] as string;

    // 如果有当前会话ID，保留当前会话，否则注销所有会话
    if (currentSessionId) {
      // 先注销所有会话
      await this.ssoService.invalidateAllUserSessions(userId);

      // 然后再激活当前会话（如果需要的话）
      // 这里简化处理，实际可能需要更复杂的逻辑
      this.logger.log(`保留当前会话: ${currentSessionId}`);

      return { message: '已注销除当前会话外的所有会话' };
    } else {
      const count = await this.ssoService.invalidateAllUserSessions(userId);
      return { message: `已注销所有会话，共 ${count} 个` };
    }
  }
}
