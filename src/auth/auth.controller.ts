import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Req,
  HttpCode,
  HttpStatus,
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
  ApiHeader,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PermissionInfoResponseDto } from './dto/permission-info.dto';
import { ApiErrorResponse } from '../common/dto/api-error-response.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// 定义包含用户信息的请求类型
interface RequestWithUser extends ExpressRequest {
  user: {
    userId: number;
    username: string;
    roles?: string[];
    tenantId?: number;
  };
}

@ApiTags('认证管理')
@ApiExtraModels(
  ApiErrorResponse,
  LoginResponseDto,
  PermissionInfoResponseDto,
  UserProfileResponseDto,
  LogoutRequestDto,
)
@Controller('system/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '用户登录',
    description: `
      通过用户名/邮箱和密码进行登录认证。
      
      特性：
      - 支持用户名或邮箱登录
      - 支持租户隔离，可选择性传入租户名称
      - 支持验证码校验（可选）
      - 支持"记住我"功能，延长令牌有效期
      - 支持多端登录，通过 clientId 区分

      返回：
      - accessToken: 访问令牌，用于后续接口调用的认证
      - refreshToken: 刷新令牌，用于在访问令牌过期时获取新的访问令牌
      - expiresTime: 访问令牌的过期时间戳

      测试示例：
      1. 使用用户名登录：
      \`\`\`bash
      curl -X POST http://localhost:3000/v1/system/auth/login \\
        -H "Content-Type: application/json" \\
        -d '{
          "username": "admin",
          "password": "admin123",
          "rememberMe": true
        }'
      \`\`\`

      2. 使用邮箱登录：
      \`\`\`bash
      curl -X POST http://localhost:3000/v1/system/auth/login \\
        -H "Content-Type: application/json" \\
        -d '{
          "email": "admin@example.com",
          "password": "admin123",
          "rememberMe": false
        }'
      \`\`\`

      3. 带验证码登录：
      \`\`\`bash
      curl -X POST http://localhost:3000/v1/system/auth/login \\
        -H "Content-Type: application/json" \\
        -d '{
          "username": "admin",
          "password": "admin123",
          "captcha": "1234",
          "captchaId": "abc-123"
        }'
      \`\`\`

      4. 带租户ID登录：
      \`\`\`bash
      curl -X POST http://localhost:3000/v1/system/auth/login \\
        -H "Content-Type: application/json" \\
        -H "tenant-id: 1" \\
        -d '{
          "username": "admin",
          "password": "admin123"
        }'
      \`\`\`
    `,
  })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '登录成功',
    schema: { $ref: getSchemaPath(LoginResponseDto) },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '认证失败',
    schema: { $ref: getSchemaPath(ApiErrorResponse) },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
    schema: { $ref: getSchemaPath(ApiErrorResponse) },
  })
  login(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: ExpressRequest,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginUserDto, req);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新访问令牌',
    description: `
      使用刷新令牌获取新的访问令牌。
      
      使用场景：
      - 当访问令牌过期时，使用刷新令牌获取新的访问令牌，避免用户重新登录
      - 支持传入会话ID，用于多端登录场景下的令牌刷新
      - 支持"记住我"状态的延续

      注意事项：
      - 刷新令牌只能使用一次，使用后会自动失效
      - 如果刷新令牌已过期，需要重新登录
      - 如果用户已被禁用，刷新操作将失败

      测试示例：
      1. 刷新令牌：
      \`\`\`bash
      curl -X POST http://localhost:3000/v1/system/auth/refresh-token \\
        -H "Content-Type: application/json" \\
        -d '{
          "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
        }'
      \`\`\`

      2. 带会话ID刷新令牌：
      \`\`\`bash
      curl -X POST http://localhost:3000/v1/system/auth/refresh-token \\
        -H "Content-Type: application/json" \\
        -d '{
          "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
          "sessionId": "session-123"
        }'
      \`\`\`
    `,
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '刷新成功',
    schema: { $ref: getSchemaPath(LoginResponseDto) },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '刷新令牌无效或已过期',
    schema: { $ref: getSchemaPath(ApiErrorResponse) },
  })
  refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: ExpressRequest,
  ): Promise<LoginResponseDto> {
    return this.authService.refreshToken(refreshTokenDto, req);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户退出' })
  @ApiResponse({
    status: 200,
    description: '退出成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        data: { type: 'boolean', example: true },
        msg: { type: 'string', example: '退出成功' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: RequestWithUser) {
    return this.authService.logout(req.user);
  }

  @Get('get-permission-info')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取用户权限信息',
    description: `
      获取当前登录用户的详细信息、角色和权限列表。
      
      返回信息包括：
      - 用户基本信息（ID、用户名、昵称等）
      - 用户角色列表
      - 用户权限列表
      
      注意：
      - 需要在请求头中携带有效的访问令牌
      - 可选择性传入租户ID，用于多租户场景
    `,
  })
  @ApiHeader({
    name: 'tenant-id',
    required: false,
    description: '租户ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    schema: { $ref: getSchemaPath(PermissionInfoResponseDto) },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
    schema: { $ref: getSchemaPath(ApiErrorResponse) },
  })
  async getPermissionInfo(
    @Req() req: RequestWithUser,
    @Headers('tenant-id') tenantIdHeader?: string,
  ): Promise<PermissionInfoResponseDto> {
    if (!req.user) {
      throw new UnauthorizedException('用户未登录');
    }

    const tenantId = tenantIdHeader ? parseInt(tenantIdHeader, 10) : undefined;
    return this.authService.getPermissionInfo(req.user.userId, tenantId);
  }

  @Get('get-profile')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取当前用户信息',
    description: `
      获取当前登录用户的基本信息。
      
      返回信息：
      - 用户ID
      - 用户名
      - 角色列表
      - 所属租户ID（如果有）
      
      使用场景：
      - 用户登录后获取个人信息
      - 用于前端展示当前用户信息
      - 用于权限判断和界面展示控制

      测试示例：
      1. 获取用户信息：
      \`\`\`bash
      curl -X GET http://localhost:3000/v1/system/auth/get-profile \\
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
      \`\`\`

      2. 带租户ID获取用户信息：
      \`\`\`bash
      curl -X GET http://localhost:3000/v1/system/auth/get-profile \\
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \\
        -H "tenant-id: 1"
      \`\`\`
    `,
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: HttpStatus.OK,
    description: '返回当前用户信息',
    schema: { $ref: getSchemaPath(UserProfileResponseDto) },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未认证或令牌已过期',
    schema: { $ref: getSchemaPath(ApiErrorResponse) },
  })
  getProfile(@Req() req: RequestWithUser): UserProfileResponseDto {
    return {
      userId: req.user.userId,
      username: req.user.username,
      roles: req.user.roles || [],
      tenantId: req.user.tenantId,
    };
  }
}
