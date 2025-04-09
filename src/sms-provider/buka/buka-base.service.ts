import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsProvider } from '../entities/sms-provider.entity';
import { getBukaHeaders } from './decorators/buka-request.decorator';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class BukaBaseService {
  private readonly logger = new Logger(BukaBaseService.name);
  protected apiKey: string;
  protected apiSecret: string;
  protected baseUrl: string;

  constructor(
    @InjectRepository(SmsProvider)
    protected readonly smsProviderRepository: Repository<SmsProvider>,
    protected readonly httpService: HttpService,
  ) {}

  protected async loadCredentials(): Promise<void> {
    const provider = await this.smsProviderRepository.findOne({
      where: {
        name: 'onbuka',
        isActive: true,
      },
    });

    if (!provider || !provider.baseUrl || !provider.configDetails) {
      throw new Error('Buka API configuration not found in database');
    }

    const configDetails = provider.configDetails;
    const apiKey = configDetails.apiKey as string;
    const apiSecret = configDetails.apiSecret as string;

    if (!apiKey || !apiSecret) {
      throw new Error(
        'Buka API credentials (apiKey/apiSecret) not found in configuration',
      );
    }

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = provider.baseUrl;
  }

  protected async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    data?: any,
  ): Promise<T> {
    if (!this.apiKey || !this.apiSecret) {
      await this.loadCredentials();
    }

    const headers = getBukaHeaders(this.apiKey, this.apiSecret);
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response =
        method === 'GET'
          ? await firstValueFrom(this.httpService.get<T>(url, { headers }))
          : await firstValueFrom(
              this.httpService.post<T>(url, data, { headers }),
            );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `Buka API request failed: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error('Unknown error during Buka API request', error);
      }
      throw error;
    }
  }
}
