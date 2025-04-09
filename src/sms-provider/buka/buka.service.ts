import { Injectable, Logger, Inject } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TenantChannelConfig } from '../../sms-channel-config/entities/tenant-channel-config.entity';
import { UserChannelConfig } from '../../sms-channel-config/entities/user-channel-config.entity';

interface BukaBalanceResponse {
  code: string | number;
  balance?: number;
  data?: {
    balance?: number;
  };
  reason?: string;
  message?: string;
  status?: string;
}

interface BukaErrorResponse {
  code?: string | number;
  message?: string;
  reason?: string;
}

interface BukaCredentials {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  appId: string;
}

@Injectable()
export class BukaService {
  private readonly logger = new Logger(BukaService.name);
  private readonly CACHE_TTL = 300; // 5 minutes cache

  constructor(
    @InjectRepository(TenantChannelConfig)
    private readonly tenantChannelConfigRepository: Repository<TenantChannelConfig>,
    @InjectRepository(UserChannelConfig)
    private readonly userChannelConfigRepository: Repository<UserChannelConfig>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
  ) {}

  private getCacheKey(tenantId: number, userId: number): string {
    return `buka_credentials:${tenantId}:${userId}`;
  }

  private async loadCredentials(
    tenantId: number,
    userId: number,
  ): Promise<BukaCredentials> {
    // Try to get from cache first
    const cacheKey = this.getCacheKey(tenantId, userId);
    try {
      const cachedCredentials =
        await this.cacheManager.get<BukaCredentials>(cacheKey);
      if (cachedCredentials) {
        this.logger.debug(`Credentials found in cache for key: ${cacheKey}`);
        return cachedCredentials;
      } else {
        this.logger.debug(
          `Credentials not found in cache for key: ${cacheKey}`,
        );
      }
    } catch (cacheError) {
      this.logger.error(`Failed to get cache for key ${cacheKey}`, cacheError);
      // Continue to load from DB if cache fails
    }

    // Get tenant channel config
    const tenantConfig = await this.tenantChannelConfigRepository.findOne({
      where: { tenantId, channel: 'buka', isActive: true },
    });

    if (!tenantConfig || !tenantConfig.apiKey || !tenantConfig.apiSecret) {
      throw new Error('Buka channel is not configured for this tenant');
    }

    // Get user channel config
    const userConfig = await this.userChannelConfigRepository.findOne({
      where: { userId, channel: 'buka', isActive: true },
    });

    if (!userConfig || !userConfig.configDetails) {
      throw new Error('Invalid user channel config structure');
    }

    const { appId } = userConfig.configDetails;
    if (typeof appId !== 'string') {
      this.logger.error('Invalid appId in configDetails', {
        hasConfigDetails: !!userConfig.configDetails,
        hasAppId: 'appId' in userConfig.configDetails,
        appIdType: typeof appId,
        configValue: userConfig.configDetails,
      });
      throw new Error('Buka appId not found or invalid in user channel config');
    }

    const credentials: BukaCredentials = {
      apiKey: tenantConfig.apiKey,
      apiSecret: tenantConfig.apiSecret,
      baseUrl: tenantConfig.baseUrl || 'https://api.onbuka.com',
      appId,
    };

    // Cache the credentials
    try {
      await this.cacheManager.set(cacheKey, credentials, this.CACHE_TTL);
      this.logger.debug(`Credentials set in cache for key: ${cacheKey}`);
    } catch (cacheError) {
      this.logger.error(`Failed to set cache for key ${cacheKey}`, cacheError);
    }

    return credentials;
  }

  private getRequestHeaders(
    apiKey: string,
    apiSecret: string,
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSign(apiKey, apiSecret, timestamp);

    return {
      'Content-Type': 'application/json;charset=UTF-8',
      Sign: sign,
      Timestamp: timestamp.toString(),
      'Api-Key': apiKey,
    };
  }

  async getBalance(
    tenantId: number,
    userId: number,
  ): Promise<{ balance: number }> {
    const credentials = await this.loadCredentials(tenantId, userId);

    try {
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );
      const url = `${credentials.baseUrl}/v3/getBalance?appId=${credentials.appId}`;

      this.logger.log(`Requesting Buka balance from URL: ${url}`);
      this.logger.debug(`Request headers: ${JSON.stringify(headers, null, 2)}`);

      const response = await axios.get<BukaBalanceResponse>(url, {
        headers,
      });

      const responseData = response.data;
      this.logger.log(
        `Received Buka balance response: ${JSON.stringify(responseData)}`,
      );

      if (responseData.status === '-1') {
        const errorMessage = `Buka API error: ${responseData.reason}`;
        this.logger.error(errorMessage);
        this.logger.error(`Full response: ${JSON.stringify(responseData)}`);
        throw new Error(errorMessage);
      }

      let originalBalance = 0;
      if (responseData.balance !== undefined) {
        originalBalance = Number(responseData.balance);
      } else if (responseData.data?.balance !== undefined) {
        originalBalance = Number(responseData.data.balance);
      } else {
        const warningMessage = `Unexpected Buka response format: ${JSON.stringify(responseData)}`;
        this.logger.warn(warningMessage);
        throw new Error(warningMessage);
      }

      // 按照 400:270 的比例转换余额
      const convertedBalance = (originalBalance * 270) / 400;

      this.logger.log(`Buka original balance: ${originalBalance}`);
      this.logger.log(`Converted balance (400:270): ${convertedBalance}`);

      // 返回值为简单对象 { balance }，全局拦截器会自动封装为 { code, message, data: { balance } }
      return { balance: convertedBalance };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BukaErrorResponse>;
        const responseData = axiosError.response?.data;
        const errorMessage = `Buka API error: ${responseData?.message || responseData?.reason || axiosError.message || 'Unknown error'}`;
        this.logger.error(errorMessage);
        this.logger.error(
          `Full error details: ${JSON.stringify({
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: responseData,
            headers: axiosError.response?.headers,
          })}`,
        );
        throw new Error(errorMessage);
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error during Buka API call';
      this.logger.error(`Unexpected error: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw new Error(errorMessage);
    }
  }

  private generateSign(
    apiKey: string,
    apiSecret: string,
    timestamp: number,
  ): string {
    if (!apiKey || !apiSecret || !timestamp) {
      this.logger.error('Missing required parameters for sign generation', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasTimestamp: !!timestamp,
      });
      throw new Error('Missing required parameters for sign generation');
    }

    // 根据官方文档，签名需要 API Key + API Secret + Timestamp
    const signStr = `${apiKey}${apiSecret}${timestamp}`;
    this.logger.log(`Generating Buka signature with message: ${signStr}`);
    this.logger.debug(`Using apiSecret: ${apiSecret.substring(0, 4)}...`);

    const sign = crypto.createHash('md5').update(signStr).digest('hex');
    this.logger.log(`Generated sign: ${sign}`);
    return sign;
  }
}
