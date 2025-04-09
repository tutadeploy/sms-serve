import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Query,
  HttpStatus,
  HttpCode,
  Logger,
  ParseIntPipe,
  UseGuards,
  Request,
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
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { BukaBalanceResponseDto } from './dto/buka-balance-response.dto';
import { UserService } from '../user/user.service';
import { TenantService } from '../tenant/tenant.service';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';

interface RequestWithUser extends ExpressRequest {
  user: {
    userId: number;
    username: string;
    role: string;
    tenantId: number;
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新租户渠道配置' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '配置成功',
    schema: { example: {} },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数错误或渠道不支持',
  })
  async setTenantChannel(
    @Body() dto: SetChannelDto,
    @Query('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<void> {
    this.logger.debug(`更新租户渠道配置: ${JSON.stringify(dto)}`);
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    await this.smsChannelConfigService.setTenantChannelConfig(
      tenantId,
      dto.channel,
      dto.apiKey,
      dto.apiSecret,
      dto.baseUrl,
    );
    // 成功时不返回 body，符合 PUT 规范
  }

  @Post('set-sms-buka')
  @ApiOperation({ summary: '设置用户Buka配置' })
  @ApiResponse({ status: 200, description: '配置成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 404, description: '用户或租户不存在' })
  @HttpCode(HttpStatus.OK)
  async setUserBukaConfig(@Body() dto: SetBukaUserConfigDto): Promise<void> {
    this.logger.log(
      `设置用户 ${dto.username} (租户 ${dto.tenantName}) 的Buka配置`,
    );

    // 首先获取用户和租户信息
    const user = await this.userService.findByUsername(dto.username);
    if (!user) {
      throw new BusinessException(
        '用户不存在',
        BusinessErrorCode.USER_NOT_FOUND,
      );
    }

    const tenant = await this.tenantService.findByName(dto.tenantName);
    if (!tenant) {
      throw new BusinessException(
        '租户不存在',
        BusinessErrorCode.TENANT_NOT_FOUND,
      );
    }

    // 设置用户的Buka配置
    await this.smsChannelConfigService.setUserChannelConfig(
      user.id,
      tenant.id,
      'buka',
      { appId: dto.appId },
    );
  }

  @Get('supported-countries/list')
  @ApiOperation({ summary: '获取渠道支持的国家列表' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    schema: { example: [{ code: 'JP', dialCode: '+81', name: 'Japan' }] },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
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
  @RequirePermissions('system:sms:balance')
  async getBukaBalance(
    @Request() req: RequestWithUser,
  ): Promise<{ balance: number }> {
    const result = await this.smsChannelConfigService.getBukaBalance(
      req.user.tenantId,
      req.user.userId,
    );
    return result;
  }
}
