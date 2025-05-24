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
  SetMetadata,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SmsChannelConfigService } from './sms-channel-config.service';
import { SetChannelDto } from './dto/set-channel.dto';
import { SetUserChannelConfigDto } from './dto/set-user-channel-config.dto';
import { BukaBalanceResponseDto } from './dto/buka-balance-response.dto';
import { SmppBalanceResponseDto } from './dto/smpp-balance-response.dto';
import { UserService } from '../user/user.service';
import { TenantService } from '../tenant/tenant.service';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';
import { JwtAuthGuard, IS_PUBLIC_KEY } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { User } from '../user/entities/user.entity';
import { SmsChannelListRespVO } from './dto/sms-channel.vo';

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

  @Get('smpp/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 SMPP 账户余额' })
  @ApiResponse({
    status: 200,
    description: '成功',
    type: SmppBalanceResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: '获取余额失败（例如，API错误或配置问题）',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'SMPP API error: ...' },
        timestamp: { type: 'string', example: '2025-04-08T18:11:04.900Z' },
        path: { type: 'string', example: '/v1/api/channels/smpp/balance' },
        method: { type: 'string', example: 'GET' },
      },
    },
  })
  async getSmppBalance(
    @Req() req: RequestWithUser,
    @Query('tenantId') tenantIdQuery?: string,
  ): Promise<{ balance: number }> {
    const userId = req.user.userId || req.user.sub;
    // 优先使用URL查询参数中的tenantId，如果没有则使用JWT中的
    const tenantId = tenantIdQuery
      ? parseInt(tenantIdQuery, 10)
      : req.user.tenantId || 1; // 如果JWT中也没有，默认使用1

    this.logger.log(`获取SMPP余额，用户ID: ${userId}, 租户ID: ${tenantId}`);

    if (!userId) {
      throw new Error('无法获取用户ID');
    }

    const result = await this.smsChannelConfigService.getSmppBalance(
      tenantId,
      userId,
    );
    return result;
  }

  @Post('public-user-channel-config')
  @SetMetadata(IS_PUBLIC_KEY, true)
  @ApiOperation({ summary: '设置用户的渠道特定配置 (无需认证)' })
  @ApiResponse({
    status: 200,
    description: '成功',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        channel: { type: 'string', example: 'smpp' },
        configDetails: {
          type: 'object',
          example: { appId: 'user_app_id_123' },
        },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  async setUserChannelConfig(@Body() dto: SetUserChannelConfigDto): Promise<{
    id: number;
    channel: string;
    configDetails: Record<string, any>;
    isActive: boolean;
  }> {
    this.logger.log(`设置用户渠道配置 (无需认证): ${JSON.stringify(dto)}`);

    try {
      const tenant = await this.tenantService.findByName(dto.tenantName);
      if (!tenant) {
        throw new BusinessException(
          `租户 ${dto.tenantName} 不存在`,
          BusinessErrorCode.TENANT_NOT_FOUND,
        );
      }

      let userToConfig: User | null = null;
      try {
        this.logger.log(`尝试查找用户名: "${dto.username}" (不区分大小写)`);

        // 使用UserService中新增的不区分大小写查找方法
        userToConfig = await this.userService.findByUsernameIgnoreCase(
          dto.username,
        );

        if (userToConfig) {
          this.logger.log(
            `通过userService.findByUsernameIgnoreCase找到用户: ${dto.username}, 实际用户名: ${userToConfig.username}, ID: ${userToConfig.id}`,
          );
        } else {
          this.logger.log(
            `userService.findByUsernameIgnoreCase 未找到用户: ${dto.username}`,
          );
          throw new Error(`用户 ${dto.username} 不存在`); // 保持原有错误抛出逻辑，如果findByUsernameIgnoreCase返回null则认为用户不存在
        }
      } catch (error) {
        // 如果 findByUsernameIgnoreCase 内部处理了错误并返回 null，这里的 catch 可能不会捕获"未找到"的情况
        // 但如果它抛出其他异常，这里会捕获
        this.logger.error(
          `查找用户 ${dto.username} 失败: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw new BusinessException(
          `用户 ${dto.username} 不存在或查找失败: ${error instanceof Error ? error.message : String(error)}`,
          BusinessErrorCode.USER_NOT_FOUND,
        );
      }

      // 此处 userToConfig 应该是一个有效的 User 对象, 因为如果未找到，上面已经抛出错误
      this.logger.log(
        `为用户ID ${userToConfig.id} (租户ID: ${tenant.id}) 设置渠道 '${dto.channel}' 的配置: ${JSON.stringify(dto.configDetails)}`,
      );

      const config = await this.smsChannelConfigService.setUserChannelConfig(
        userToConfig.id, // 使用 userToConfig.id
        tenant.id,
        dto.channel,
        dto.configDetails,
      );

      this.logger.log(
        `成功为用户 ${dto.username} (ID: ${userToConfig.id}) 设置渠道 '${dto.channel}' 配置，配置ID: ${config.id},详情: ${JSON.stringify(config.configDetails)}`,
      );

      return {
        id: config.id,
        channel: config.channel,
        configDetails: config.configDetails,
        isActive: config.isActive,
      };
    } catch (error: unknown) {
      this.logger.error(
        `设置用户渠道配置失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        `设置用户渠道配置失败: ${error instanceof Error ? error.message : String(error)}`,
        BusinessErrorCode.CHANNEL_CONFIG_ERROR,
      );
    }
  }

  @Get('list')
  @ApiOperation({ summary: '获取渠道列表' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: SmsChannelListRespVO,
  })
  async getChannelList(): Promise<SmsChannelListRespVO> {
    return this.smsChannelConfigService.getChannelList();
  }
}
