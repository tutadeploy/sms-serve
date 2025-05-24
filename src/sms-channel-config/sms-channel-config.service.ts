import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantChannelConfig } from './entities/tenant-channel-config.entity';
import { UserChannelConfig } from './entities/user-channel-config.entity';
import { ChannelSupportedCountry } from './entities/channel-supported-country.entity';
import { BukaSmsChannelService } from './channels/buka-sms-channel.service';
import { SmppSmsChannelService } from './channels/smpp-sms-channel.service';
import {
  SmsChannel,
  CountryInfo,
} from '../common/channels/sms-channel.abstract';
import { UserService } from '../user/user.service';
import { TenantService } from '../tenant/tenant.service';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';
import { BukaService } from '../sms-provider/buka/buka.service';
import { SmppService } from '../sms-provider/smpp/smpp.service';
import { SmsProvider } from '../sms-provider/entities/sms-provider.entity';
import { SmsChannelVO, SmsChannelListRespVO } from './dto/sms-channel.vo';

@Injectable()
export class SmsChannelConfigService {
  private readonly logger = new Logger(SmsChannelConfigService.name);
  private readonly channelServices: Map<string, SmsChannel> = new Map();

  constructor(
    @InjectRepository(TenantChannelConfig)
    private readonly tenantChannelConfigRepository: Repository<TenantChannelConfig>,
    @InjectRepository(UserChannelConfig)
    private readonly userChannelConfigRepository: Repository<UserChannelConfig>,
    @InjectRepository(ChannelSupportedCountry)
    private readonly channelSupportedCountryRepository: Repository<ChannelSupportedCountry>,
    private readonly bukaSmsChannelService: BukaSmsChannelService,
    private readonly smppSmsChannelService: SmppSmsChannelService,
    private readonly userService: UserService,
    private readonly tenantService: TenantService,
    @Inject(forwardRef(() => BukaService))
    private readonly bukaService: BukaService,
    @Inject(forwardRef(() => SmppService))
    private readonly smppService: SmppService,
    @InjectRepository(SmsProvider)
    private readonly smsProviderRepository: Repository<SmsProvider>,
  ) {
    // 注册各个渠道服务
    this.registerChannelService(this.bukaSmsChannelService);
    this.registerChannelService(this.smppSmsChannelService);
  }

  /**
   * 注册渠道服务
   */
  private registerChannelService(channelService: SmsChannel): void {
    const channelCode = channelService.getChannelCode();
    this.channelServices.set(channelCode, channelService);
    this.logger.log(
      `已注册短信渠道服务: ${channelService.getChannelName()} (${channelCode})`,
    );
  }

  /**
   * 获取指定渠道的服务实例
   */
  getChannelService(channelCode: string): SmsChannel {
    const service = this.channelServices.get(channelCode);
    if (!service) {
      throw new BusinessException(
        `未找到渠道服务: ${channelCode}`,
        BusinessErrorCode.CHANNEL_NOT_FOUND,
      );
    }
    return service;
  }

  /**
   * 获取所有支持的渠道
   */
  getSupportedChannels(): Array<{ code: string; name: string }> {
    const channels: Array<{ code: string; name: string }> = [];
    this.channelServices.forEach((service, code) => {
      channels.push({ code, name: service.getChannelName() });
    });
    return channels;
  }

  /**
   * 设置租户的渠道配置
   */
  async setTenantChannelConfig(
    tenantId: number,
    channel: string,
    apiKey: string,
    apiSecret: string,
    baseUrl?: string,
    configDetails?: Record<string, unknown>,
  ): Promise<TenantChannelConfig> {
    try {
      // 验证渠道是否存在
      this.getChannelService(channel);

      const existingConfig = await this.tenantChannelConfigRepository.findOne({
        where: { tenantId, channel },
      });

      if (existingConfig) {
        existingConfig.apiKey = apiKey;
        existingConfig.apiSecret = apiSecret;
        if (baseUrl) {
          // 将baseUrl存储在configDetails中，因为实体中已经没有baseUrl字段
          existingConfig.configDetails = {
            ...existingConfig.configDetails,
            baseUrl,
          };
        }
        if (configDetails) {
          existingConfig.configDetails = {
            ...existingConfig.configDetails,
            ...configDetails,
          };
        }
        existingConfig.isActive = true;
        return this.tenantChannelConfigRepository.save(existingConfig);
      }

      const newConfig = this.tenantChannelConfigRepository.create({
        tenantId,
        channel,
        apiKey,
        apiSecret,
        configDetails: {
          ...(configDetails || {}),
          ...(baseUrl ? { baseUrl } : {}),
        },
        isActive: true,
      });

      return this.tenantChannelConfigRepository.save(newConfig);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        `设置租户渠道配置失败: ${error instanceof Error ? error.message : String(error)}`,
        BusinessErrorCode.CHANNEL_CONFIG_ERROR,
      );
    }
  }

  /**
   * 设置用户的渠道配置
   */
  async setUserChannelConfig(
    userId: number,
    tenantId: number,
    channel: string,
    configDetails: Record<string, unknown>,
  ): Promise<UserChannelConfig> {
    try {
      // 验证渠道是否存在
      this.getChannelService(channel);

      // 验证用户ID是否存在
      try {
        const user = await this.userService.findOne(userId);
        this.logger.debug(
          `验证用户ID ${userId} 存在，用户名: ${user.username}`,
        );
      } catch (error) {
        this.logger.error(
          `用户ID ${userId} 不存在或无法验证: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      this.logger.debug(
        `设置用户渠道配置 - 用户ID: ${userId}, 租户ID: ${tenantId}, 渠道: ${channel}, 配置: ${JSON.stringify(
          configDetails,
        )}`,
      );

      // 使用更精确的查询，确保找到正确的用户记录
      const existingConfig = await this.userChannelConfigRepository.findOne({
        where: {
          userId: userId,
          channel: channel,
        },
      });

      if (existingConfig) {
        this.logger.debug(
          `找到现有配置 ID: ${existingConfig.id}, 用户ID: ${existingConfig.userId}, 租户ID: ${existingConfig.tenantId}`,
        );

        // 确保tenantId也是最新的
        existingConfig.tenantId = tenantId;
        existingConfig.configDetails = configDetails;
        existingConfig.isActive = true;

        const savedConfig =
          await this.userChannelConfigRepository.save(existingConfig);
        this.logger.debug(
          `更新配置成功，ID: ${savedConfig.id}, 用户ID: ${savedConfig.userId}`,
        );
        return savedConfig;
      }

      // 检查是否有任何使用相同用户ID的记录（无论渠道）
      const anyUserConfig = await this.userChannelConfigRepository.findOne({
        where: { userId: userId },
      });

      if (anyUserConfig) {
        this.logger.debug(
          `用户ID ${userId} 有其他配置记录 ID: ${anyUserConfig.id}，渠道: ${anyUserConfig.channel}`,
        );
      } else {
        this.logger.debug(`用户ID ${userId} 没有任何现有配置记录`);
      }

      this.logger.debug(`未找到现有配置，创建新配置`);
      const newConfig = this.userChannelConfigRepository.create({
        userId,
        tenantId,
        channel,
        configDetails,
        isActive: true,
      });

      // 确认创建的配置数据
      this.logger.debug(
        `准备保存新配置 - 用户ID: ${newConfig.userId}, 租户ID: ${newConfig.tenantId}, 渠道: ${newConfig.channel}`,
      );

      const savedConfig =
        await this.userChannelConfigRepository.save(newConfig);
      this.logger.debug(
        `创建配置成功，ID: ${savedConfig.id}, 用户ID: ${savedConfig.userId}, 租户ID: ${savedConfig.tenantId}`,
      );
      return savedConfig;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        `设置用户渠道配置失败: ${error instanceof Error ? error.message : String(error)}`,
        BusinessErrorCode.CHANNEL_CONFIG_ERROR,
      );
    }
  }

  /**
   * 获取支持的国家列表
   */
  async getSupportedCountries(channel: string): Promise<CountryInfo[]> {
    try {
      // 验证渠道是否存在
      this.getChannelService(channel);

      const countries = await this.channelSupportedCountryRepository.find({
        where: { channel, isActive: true },
      });

      return countries.map(
        (country): CountryInfo => ({
          code: country.countryCode,
          dialCode: country.dialCode,
        }),
      );
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        `获取支持的国家列表失败: ${error instanceof Error ? error.message : String(error)}`,
        BusinessErrorCode.CHANNEL_SUPPORT_ERROR,
      );
    }
  }

  /**
   * 获取Buka余额
   */
  async getBukaBalance(
    tenantId: number,
    userId: number,
  ): Promise<{ balance: number }> {
    try {
      // 验证租户是否配置了Buka渠道
      const tenantConfig = await this.tenantChannelConfigRepository.findOne({
        where: {
          tenantId,
          channel: 'onbuka',
          isActive: true,
        },
      });

      if (!tenantConfig) {
        throw new BusinessException(
          '租户未配置Buka渠道或配置未激活',
          BusinessErrorCode.CHANNEL_CONFIG_ERROR,
        );
      }

      // 调用BukaService获取余额
      const result = await this.bukaService.getBalance(tenantId, userId);
      this.logger.log(
        `[SmsChannelConfigService] BukaService.getBalance result: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[SmsChannelConfigService] Failed to get Buka balance: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BusinessException(
        error instanceof Error ? error.message : 'Failed to get Buka balance',
        BusinessErrorCode.CHANNEL_CONFIG_ERROR,
      );
    }
  }

  /**
   * 获取SMPP余额
   */
  async getSmppBalance(
    tenantId: number,
    userId: number,
  ): Promise<{ balance: number }> {
    try {
      // 验证租户是否配置了SMPP渠道
      const tenantConfig = await this.tenantChannelConfigRepository.findOne({
        where: {
          tenantId,
          channel: 'smpp',
          isActive: true,
        },
      });

      if (!tenantConfig) {
        throw new BusinessException(
          '租户未配置SMPP渠道或配置未激活',
          BusinessErrorCode.CHANNEL_CONFIG_ERROR,
        );
      }

      // 调用SmppService获取余额
      const result = await this.smppService.getBalance(tenantId, userId);
      this.logger.log(
        `[SmsChannelConfigService] SmppService.getBalance result: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[SmsChannelConfigService] Failed to get SMPP balance: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BusinessException(
        error instanceof Error ? error.message : 'Failed to get SMPP balance',
        BusinessErrorCode.CHANNEL_CONFIG_ERROR,
      );
    }
  }

  async getChannelList(): Promise<SmsChannelListRespVO> {
    // 获取所有激活的渠道配置
    const channels = await this.tenantChannelConfigRepository.find({
      where: { isActive: true },
      relations: ['tenant'],
    });

    // 获取所有激活的供应商
    const providers = await this.smsProviderRepository.find({
      where: { isActive: true },
    });

    // 构建渠道列表
    const channelList: SmsChannelVO[] = channels.map((channel) => {
      const provider = providers.find((p) => p.name === channel.channel);
      const displayName = provider?.displayName || channel.channel;
      return {
        id: channel.id,
        name: displayName,
        code: channel.channel,
        status: channel.isActive ? 1 : 0,
        providerId: provider?.id || 0,
        description: displayName,
        createTime: channel.createTime?.toISOString(),
        updateTime: channel.updateTime?.toISOString(),
      };
    });

    return {
      list: channelList,
      total: channelList.length,
    };
  }
}
