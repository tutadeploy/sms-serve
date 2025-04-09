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
}
