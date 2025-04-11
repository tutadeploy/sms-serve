import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Query,
  Logger,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SmsChannelConfigService } from './sms-channel-config.service';
import { SetChannelDto } from './dto/set-channel.dto';
import { SetBukaUserConfigDto } from './dto/set-buka-user-config.dto';
import { BukaBalanceResponseDto } from './dto/buka-balance-response.dto';
import { UserService } from '../user/user.service';
import { TenantService } from '../tenant/tenant.service';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UserRole } from '../user/entities/user.entity';

// 定义包含用户信息的请求类型
interface RequestWithUser extends Request {
  user: {
    userId: number;
    username: string;
    roles?: string[];
    tenantId?: number;
    sub?: number;
  };
}

// 定义用户查询结果接口
interface UserQueryResult {
  id: number;
  username: string;

  [key: string]: any;
}

@ApiTags('渠道配置')
@Controller('api/channels')
export class SmsChannelConfigController {
  private readonly logger = new Logger(SmsChannelConfigController.name);

  constructor(
    private readonly smsChannelConfigService: SmsChannelConfigService,
    private readonly userService: UserService,
    private readonly tenantService: TenantService,
  ) {}

  @Put('update')
  @ApiOperation({ summary: '设置租户的渠道配置' })
  @ApiResponse({
    status: 200,
    description: '成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        message: { type: 'string', example: '设置成功' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            channel: { type: 'string', example: 'buka' },
            isActive: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  async setChannel(
    @Body() setChannelDto: SetChannelDto,
    @Query('tenantId', new ParseIntPipe()) tenantId: number,
  ) {
    this.logger.debug(`更新租户渠道配置: ${JSON.stringify(setChannelDto)}`);
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // 获取baseUrl (如果在configDetails中提供)
    const baseUrl = setChannelDto.configDetails?.baseUrl;

    // 将ConfigDetailsDto转换为Record<string, unknown>
    const configDetails = setChannelDto.configDetails
      ? { ...(setChannelDto.configDetails as Record<string, unknown>) }
      : undefined;

    await this.smsChannelConfigService.setTenantChannelConfig(
      tenantId,
      setChannelDto.channel,
      setChannelDto.apiKey,
      setChannelDto.apiSecret,
      baseUrl,
      configDetails,
    );
    // 成功时不返回 body，符合 PUT 规范
  }

  @Post('buka/user-config')
  @ApiOperation({ summary: '设置用户的Buka渠道配置' })
  @ApiResponse({
    status: 200,
    description: '成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        message: { type: 'string', example: '设置成功' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            appId: { type: 'string', example: '123456' },
            isActive: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  async setBukaUserConfig(
    @Body() dto: SetBukaUserConfigDto,
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    this.logger.log(`设置用户Buka配置: ${JSON.stringify(dto)}`);

    // 验证用户和租户
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BusinessException(
        '用户不存在',
        BusinessErrorCode.USER_NOT_FOUND,
      );
    }

    const tenant = await this.tenantService.findOne(tenantId);
    if (!tenant) {
      throw new BusinessException(
        '租户不存在',
        BusinessErrorCode.TENANT_NOT_FOUND,
      );
    }

    // 设置用户渠道配置
    await this.smsChannelConfigService.setUserChannelConfig(
      user.id,
      tenant.id,
      'onbuka',
      { appId: dto.appId },
    );
  }

  @Get('supported-countries/list')
  @ApiOperation({ summary: '获取渠道支持的国家列表' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: { example: [{ code: 'JP', dialCode: '+81', name: 'Japan' }] },
  })
  @ApiResponse({
    status: 400,
    description: '渠道不支持或不存在',
  })
  async getSupportedCountries(@Query('channel') channel: string) {
    this.logger.debug(`获取渠道支持的国家列表: ${channel}`);
    return await this.smsChannelConfigService.getSupportedCountries(channel);
  }

  @Get('buka/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 Buka 账户余额' })
  @ApiResponse({
    status: 200,
    description: '成功',
    type: BukaBalanceResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: '获取余额失败（例如，API错误或配置问题）',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Buka API error: ...' },
        timestamp: { type: 'string', example: '2025-04-08T18:11:04.900Z' },
        path: { type: 'string', example: '/v1/api/channels/buka/balance' },
        method: { type: 'string', example: 'GET' },
      },
    },
  })
  async getBukaBalance(
    @Req() req: RequestWithUser,
    @Query('tenantId') tenantIdQuery?: string,
  ): Promise<{ balance: number }> {
    const userId = req.user.userId || req.user.sub;
    // 优先使用URL查询参数中的tenantId，如果没有则使用JWT中的
    const tenantId = tenantIdQuery
      ? parseInt(tenantIdQuery, 10)
      : req.user.tenantId || 1; // 如果JWT中也没有，默认使用1

    this.logger.log(`获取Buka余额，用户ID: ${userId}, 租户ID: ${tenantId}`);

    if (!userId) {
      throw new Error('无法获取用户ID');
    }

    const result = await this.smsChannelConfigService.getBukaBalance(
      tenantId,
      userId,
    );
    return result;
  }

  @Post('set-sms-buka')
  @ApiOperation({ summary: '设置用户的Buka appId (无需认证)' })
  @ApiResponse({
    status: 200,
    description: '成功',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        appId: { type: 'string', example: 'sWqvxdRZ' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  async setSmsBuka(
    @Body() dto: SetBukaUserConfigDto,
  ): Promise<{ id: number; appId: string; isActive: boolean }> {
    this.logger.log(`设置用户Buka配置(无需认证): ${JSON.stringify(dto)}`);

    try {
      // 通过租户名称查找租户
      const tenant = await this.tenantService.findByName(dto.tenantName);
      if (!tenant) {
        throw new BusinessException(
          `租户 ${dto.tenantName} 不存在`,
          BusinessErrorCode.TENANT_NOT_FOUND,
        );
      }

      let user;
      try {
        // 尝试通过用户名查找用户
        this.logger.log(`尝试查找用户名: "${dto.username}" (不区分大小写)`);

        // 使用SQL查询用户（不区分大小写）
        const results = await this.userService['userRepository'].query(
          `SELECT * FROM users WHERE LOWER(username) = LOWER(?)`,
          [dto.username],
        );

        // 转换查询结果为定义的类型

        const users: UserQueryResult[] =
          results as unknown as UserQueryResult[];

        if (users && users.length > 0) {
          const foundUser: UserQueryResult = users[0];
          this.logger.log(
            `通过SQL找到用户: ${dto.username}, 实际用户名: ${foundUser.username}, ID: ${foundUser.id}`,
          );

          // 获取完整用户对象
          user = await this.userService.findOne(foundUser.id);
        } else {
          this.logger.log(`SQL查询未找到用户: ${dto.username}`);
          throw new Error(`用户 ${dto.username} 不存在`);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // 用户不存在，返回错误
        this.logger.log(`用户 ${dto.username} 不存在`);
        throw new BusinessException(
          `用户 ${dto.username} 不存在`,
          BusinessErrorCode.USER_NOT_FOUND,
        );
      }

      this.logger.log(
        `为用户ID ${user.id} 设置Buka配置，租户ID: ${tenant.id}, appId: ${dto.appId}`,
      );

      // 设置用户渠道配置
      const config = await this.smsChannelConfigService.setUserChannelConfig(
        user.id,
        tenant.id,
        'onbuka',
        { appId: dto.appId },
      );

      this.logger.log(
        `成功为用户 ${dto.username} (ID: ${user.id}) 设置Buka配置，配置ID: ${config.id}, appId: ${dto.appId}`,
      );

      return {
        id: config.id,
        appId: dto.appId,
        isActive: config.isActive,
      };
    } catch (error: unknown) {
      this.logger.error(
        `设置用户Buka配置失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        `设置用户Buka配置失败: ${error instanceof Error ? error.message : String(error)}`,
        BusinessErrorCode.CHANNEL_CONFIG_ERROR,
      );
    }
  }
}
