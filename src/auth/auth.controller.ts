import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import {
  ApiTags,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { PermissionInfoResponseDto } from './dto/permission-info.dto';

// 定义包含用户信息的请求类型
interface RequestWithUser extends ExpressRequest {
  user: {
    userId: number;
    username: string;
    roles?: string[];
    tenantId?: number;
  };
}

@ApiTags('认证')
@Controller('system/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '登录成功',
    type: LoginResponseDto,
  })
  login(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: ExpressRequest,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginUserDto, req);
  }

  @Get('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新令牌' })
  @ApiQuery({
    name: 'refreshToken',
    description: '刷新令牌',
    required: true,
  })
  @ApiQuery({
    name: 'sessionId',
    description: '会话ID',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '刷新成功',
    type: LoginResponseDto,
  })
  refreshTokenByQuery(
    @Query('refreshToken') refreshToken: string,
    @Query('sessionId') sessionId?: string,
    @Req() req?: ExpressRequest,
  ): Promise<LoginResponseDto> {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken,
      sessionId,
    };
    return this.authService.refreshToken(refreshTokenDto, req);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新令牌(POST方式)' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '刷新成功',
    type: LoginResponseDto,
  })
  refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: ExpressRequest,
  ): Promise<LoginResponseDto> {
    return this.authService.refreshToken(refreshTokenDto, req);
  }

  @Post('logout')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '注销登录' })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: { type: 'string' },
        sessionId: { type: 'string', nullable: true },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '注销成功',
    type: Boolean,
  })
  logout(
    @Req() req: RequestWithUser,
    @Body() body: { refreshToken: string; sessionId?: string },
  ): Promise<boolean> {
    const userId = req.user.userId;
    return this.authService.logout(userId, body.refreshToken, body.sessionId);
  }

  @Get('get-permission-info')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取当前用户权限信息' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'tenant-id',
    description: '租户ID',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '返回当前用户权限信息',
    type: PermissionInfoResponseDto,
  })
  getPermissionInfo(
    @Req() req: RequestWithUser,
    @Headers('tenant-id') tenantId?: string,
  ): Promise<PermissionInfoResponseDto> {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('未认证用户');
    }
    return this.authService.getPermissionInfo(
      req.user.userId,
      tenantId ? +tenantId : undefined,
    );
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: '返回当前用户信息',
    schema: {
      example: {
        userId: 1,
        username: 'admin',
        roles: ['admin'],
        tenantId: 1,
      },
    },
  })
  getProfile(@Req() req: RequestWithUser): any {
    return req.user;
  }
}
