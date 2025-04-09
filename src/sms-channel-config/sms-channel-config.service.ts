import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantChannelConfig } from './entities/tenant-channel-config.entity';
import { UserChannelConfig } from './entities/user-channel-config.entity';
import { ChannelSupportedCountry } from './entities/channel-supported-country.entity';
import { BukaSmsChannelService } from './channels/buka-sms-channel.service';
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
import { SmsProvider } from '../sms-provider/entities/sms-provider.entity';

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
    private readonly userService: UserService,
    private readonly tenantService: TenantService,
    @Inject(forwardRef(() => BukaService))
    private readonly bukaService: BukaService,
    @InjectRepository(SmsProvider)
    private readonly smsProviderRepository: Repository<SmsProvider>,
  ) {
    // 注册各个渠道服务
    this.registerChannelService(this.bukaSmsChannelService);
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

      const existingConfig = await this.userChannelConfigRepository.findOne({
        where: { userId, channel },
      });

      if (existingConfig) {
        existingConfig.configDetails = configDetails;
        existingConfig.isActive = true;
        return this.userChannelConfigRepository.save(existingConfig);
      }

      const newConfig = this.userChannelConfigRepository.create({
        userId,
        tenantId,
        channel,
        configDetails,
        isActive: true,
      });

      return this.userChannelConfigRepository.save(newConfig);
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
}
