import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsProvider } from '../entities/sms-provider.entity';
import { getSmppHeaders } from './decorators/smpp-request.decorator';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class SmppBaseService {
  private readonly logger = new Logger(SmppBaseService.name);
  protected apiKey: string;
  protected apiSecret: string;
  protected baseUrl: string;
  // 根据您的描述，appid是需要的，并且与buka类似，需要有一个接口获取。
  // 我们将其添加到基础服务中，并在loadCredentials中加载。
  protected appId: string;

  constructor(
    // SmsProvider 存储的是系统级的配置，如 baseUrl 和可能的全局 apiKey/apiSecret（如果适用）
    // 具体的租户级或用户级的 apiKey/apiSecret/appId 会在 SmppService 中通过 TenantChannelConfig 和 UserChannelConfig 加载
    @InjectRepository(SmsProvider)
    protected readonly smsProviderRepository: Repository<SmsProvider>,
    protected readonly httpService: HttpService,
  ) {}

  // SmppBaseService 主要负责从 sms_providers 表加载基础的 baseUrl
  // apiKey 和 apiSecret 以及 appId 将在 SmppService 的 loadCredentials 中从 TenantChannelConfig 和 UserChannelConfig 加载
  protected async loadBaseConfig(channelName: string = 'smpp'): Promise<void> {
    const provider = await this.smsProviderRepository.findOne({
      where: {
        name: channelName, // 使用参数化的渠道名称
        isActive: true,
      },
    });

    if (!provider || !provider.baseUrl) {
      this.logger.error(
        `${channelName.toUpperCase()} API base URL configuration not found in database or is inactive`,
      );
      throw new Error(
        `${channelName.toUpperCase()} API base URL configuration not found or inactive`,
      );
    }
    this.baseUrl = provider.baseUrl;
    this.logger.debug(
      `${channelName.toUpperCase()} base URL loaded: ${this.baseUrl}`,
    );
  }

  // makeRequest 方法用于实际发送HTTP请求
  // apiKey, apiSecret 和 appId 将作为参数传入，由 SmppService 提供
  protected async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    apiKey: string, // 由 SmppService 提供
    apiSecret: string, // 由 SmppService 提供
    data?: any,
  ): Promise<T> {
    if (!this.baseUrl) {
      // 确保基础配置已加载，通常在 SmppService 的构造函数或首次使用时调用
      await this.loadBaseConfig();
    }

    const headers = getSmppHeaders(apiKey, apiSecret);
    const url = `${this.baseUrl}${endpoint}`;
    this.logger.debug(`Making ${method} request to ${url}`);
    this.logger.verbose(`Request data: ${JSON.stringify(data)}`);
    this.logger.verbose(`Request headers: ${JSON.stringify(headers)}`);

    try {
      const response =
        method === 'GET'
          ? await firstValueFrom(this.httpService.get<T>(url, { headers }))
          : await firstValueFrom(
              this.httpService.post<T>(url, data, { headers }),
            );
      this.logger.verbose(`Response data: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `SMPP API request to ${url} failed: ${error.message}`,
          error.stack,
        );
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        this.logger.error(
          `Unknown error during SMPP API request to ${url}`,
          error,
        );
      }
      throw error; // 将错误向上抛出，由调用方处理
    }
  }
}
