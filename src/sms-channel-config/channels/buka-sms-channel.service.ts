import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { createHash } from 'crypto';
import { lastValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  SmsChannel,
  SmsSendResult,
  BatchQueryResult,
  MessageStatusDetail,
  CountryInfo,
} from '../../common/channels/sms-channel.abstract';
import {
  BukaStatusCodes,
  getBukaStatusMessage,
} from '../../common/constants/channel-status-codes';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelSupportedCountry } from '../entities/channel-supported-country.entity';
import { TenantChannelConfig } from '../entities/tenant-channel-config.entity';
import { UserChannelConfig } from '../entities/user-channel-config.entity';

interface BukaConfig {
  apiKey: string;
  apiSecret: string;
  appId: string;
  baseUrl: string;
}

/**
 * Buka API响应接口
 */
interface BukaApiResponse {
  status: number;
  reason: string;
  success?: string;
  fail?: string;
  sending?: string;
  nofound?: string;
  array?: BukaMessageInfo[];
}

/**
 * Buka消息信息接口
 */
interface BukaMessageInfo {
  msgId: string;
  number: string;
  orderId?: string;
  receiveTime?: string;
  status: string;
}

/**
 * 单个订单查询响应接口
 */
interface BukaOrderQueryResponse {
  code: number;
  msg?: string;
  data?: {
    status: string;
    orderId?: string;
    number?: string;
    sentTime?: number;
    deliveredTime?: number;
    error?: string;
  };
}

/**
 * 批量订单查询响应接口
 */
interface BukaBatchQueryResponse {
  code: number;
  msg?: string;
  data?: {
    orders?: Array<{
      status: string;
      orderId: string;
      number?: string;
      sentTime?: number;
      deliveredTime?: number;
      error?: string;
    }>;
    total?: number;
    pageNo?: number;
    pageSize?: number;
  };
}

/**
 * Buka API错误接口
 */
interface BukaApiError {
  response?: {
    data?: {
      msg?: string;
    };
  };
  message?: string;
}

/**
 * Buka余额响应接口
 */
interface BukaBalanceResponse {
  status: string;
  reason: string;
  balance: string;
  gift: string;
  credit: string;
}

/**
 * Buka短信渠道服务实现
 */
@Injectable()
export class BukaSmsChannelService extends SmsChannel {
  private readonly logger = new Logger(BukaSmsChannelService.name);
  private readonly defaultBaseUrl = 'https://api.onbuka.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(ChannelSupportedCountry)
    private readonly supportedCountryRepository: Repository<ChannelSupportedCountry>,
    @InjectRepository(TenantChannelConfig)
    private readonly tenantChannelConfigRepository: Repository<TenantChannelConfig>,
    @InjectRepository(UserChannelConfig)
    private readonly userChannelConfigRepository: Repository<UserChannelConfig>,
  ) {
    super();
  }

  /**
   * 获取渠道标识
   */
  getChannelCode(): string {
    return 'buka';
  }

  /**
   * 获取渠道名称
   */
  getChannelName(): string {
    return 'Buka SMS';
  }

  /**
   * 获取API签名
   * @param apiKey API Key
   * @param apiSecret API Secret
   * @param timestamp 时间戳
   * @returns MD5签名
   */
  private generateSign(
    apiKey: string,
    apiSecret: string,
    timestamp: number,
  ): string {
    const signStr = `${apiKey}${apiSecret}${timestamp}`;
    return createHash('md5').update(signStr).digest('hex');
  }

  /**
   * 获取请求头
   * @param apiKey API Key
   * @param apiSecret API Secret
   * @returns 请求头对象
   */
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

  /**
   * 获取特定租户和用户的渠道配置
   */
  async getChannelConfig(
    tenantId: number,
    userId: number,
  ): Promise<BukaConfig> {
    // 获取租户配置
    const tenantConfig = await this.tenantChannelConfigRepository.findOne({
      where: { tenantId, channel: this.getChannelCode(), isActive: true },
    });

    if (!tenantConfig || !tenantConfig.apiKey || !tenantConfig.apiSecret) {
      throw new Error(
        `No active Buka channel configuration found for tenant ${tenantId}`,
      );
    }

    // 获取用户配置
    const userConfig = await this.userChannelConfigRepository.findOne({
      where: { userId, channel: this.getChannelCode(), isActive: true },
    });

    // 尝试获取用户配置中的appId
    let appId = '';

    // 从用户配置中获取 appId
    if (userConfig?.configDetails) {
      const details = userConfig.configDetails;
      if ('appId' in details && typeof details.appId === 'string') {
        appId = details.appId;
      }
    }

    // 如果用户配置中没有 appId，从租户配置中获取
    if (!appId && tenantConfig.configDetails) {
      const details = tenantConfig.configDetails;
      if ('appId' in details && typeof details.appId === 'string') {
        appId = details.appId;
      }
    }

    if (!appId) {
      throw new Error('No appId found in channel configuration');
    }

    return {
      apiKey: tenantConfig.apiKey,
      apiSecret: tenantConfig.apiSecret,
      appId,
      baseUrl: tenantConfig.baseUrl || this.defaultBaseUrl,
    };
  }

  /**
   * 发送单条短信
   * @param recipientNumber 接收人手机号
   * @param content 短信内容
   * @param orderId 自定义订单ID
   * @returns 发送结果
   */
  async sendSms(
    recipientNumber: string,
    content: string,
    orderId?: string,
  ): Promise<SmsSendResult> {
    try {
      const config = await this.getChannelConfig(0, 0);
      const headers = this.getRequestHeaders(config.apiKey, config.apiSecret);
      const url = `${config.baseUrl}v3/sendSms`;

      const payload = {
        appId: config.appId,
        numbers: recipientNumber,
        content,
        orderId: orderId || '',
      };

      this.logger.debug(`发送Buka短信: ${JSON.stringify(payload)}`);

      const response = await lastValueFrom(
        this.httpService.post(url, payload, { headers }),
      );

      const result = response.data as BukaApiResponse;
      this.logger.debug(`Buka短信发送结果: ${JSON.stringify(result)}`);

      if (result.status === BukaStatusCodes.SUCCESS) {
        // 成功发送
        if (result.array && result.array.length > 0) {
          const msgInfo = result.array[0];
          return {
            success: true,
            messageId: msgInfo.msgId,
            orderId: msgInfo.orderId,
          };
        } else {
          return {
            success: true,
          };
        }
      } else {
        // 发送失败
        return {
          success: false,
          errorCode: result.status,
          errorMessage: getBukaStatusMessage(result.status) || result.reason,
        };
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Buka短信发送错误: ${errorMessage}`, errorStack);
      return {
        success: false,
        errorCode: 'API_ERROR',
        errorMessage: errorMessage,
      };
    }
  }

  /**
   * 批量发送短信
   * @param recipientNumbers 接收人手机号列表
   * @param content 短信内容
   * @param orderIds 自定义订单ID列表
   * @returns 发送结果列表
   */
  async sendBatchSms(
    recipientNumbers: string[],
    content: string,
    orderIds?: string[],
  ): Promise<SmsSendResult[]> {
    try {
      const config = await this.getChannelConfig(0, 0);
      const headers = this.getRequestHeaders(config.apiKey, config.apiSecret);
      const url = `${config.baseUrl}v3/sendSms`;

      // 拼接号码和订单ID
      const numbers = recipientNumbers.join(',');
      const orderIdsStr = orderIds ? orderIds.join(',') : '';

      const payload = {
        appId: config.appId,
        numbers,
        content,
        orderId: orderIdsStr,
      };

      this.logger.debug(`批量发送Buka短信: ${JSON.stringify(payload)}`);

      const response = await lastValueFrom(
        this.httpService.post(url, payload, { headers }),
      );

      const result = response.data as BukaApiResponse;
      this.logger.debug(`Buka批量短信发送结果: ${JSON.stringify(result)}`);

      if (result.status === BukaStatusCodes.SUCCESS) {
        // 成功发送
        if (result.array && result.array.length > 0) {
          return result.array.map((msgInfo) => ({
            success: true,
            messageId: msgInfo.msgId,
            orderId: msgInfo.orderId,
            recipientNumber: msgInfo.number,
          }));
        } else {
          // 没有详细数组信息但状态码成功
          return recipientNumbers.map((number) => ({
            success: true,
            recipientNumber: number,
          }));
        }
      } else {
        // 批量发送失败
        return recipientNumbers.map((number) => ({
          success: false,
          recipientNumber: number,
          errorCode: result.status,
          errorMessage: getBukaStatusMessage(result.status) || result.reason,
        }));
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Buka批量短信发送错误: ${errorMessage}`, errorStack);
      return recipientNumbers.map((number) => ({
        success: false,
        recipientNumber: number,
        errorCode: 'API_ERROR',
        errorMessage: errorMessage,
      }));
    }
  }

  /**
   * 查询消息状态
   * @param messageIds 消息ID列表
   * @returns 消息状态详情数组
   */
  async queryMessageStatusList(
    messageIds: string[],
  ): Promise<MessageStatusDetail[]> {
    try {
      const config = await this.getChannelConfig(0, 0);
      const headers = this.getRequestHeaders(config.apiKey, config.apiSecret);
      const url = `${config.baseUrl}/v3/getReport`;

      const payload = {
        appId: config.appId,
        msgids: messageIds.join(','),
      };

      this.logger.debug(`查询Buka消息状态: ${JSON.stringify(payload)}`);

      const response = await lastValueFrom(
        this.httpService.post(url, payload, { headers }),
      );

      const result = response.data as BukaApiResponse;
      this.logger.debug(`Buka消息状态查询结果: ${JSON.stringify(result)}`);

      if (
        result.status === BukaStatusCodes.SUCCESS &&
        result.array &&
        result.array.length > 0
      ) {
        return result.array.map((item) => {
          let status: MessageStatusDetail['status'] = 'unknown';

          // 转换Buka状态为我们的标准状态
          switch (item.status) {
            case '0':
              status = 'delivered';
              break;
            case '1':
              status = 'submitted';
              break;
            case '-1':
              status = 'failed';
              break;
            default:
              status = 'unknown';
          }

          // 解析接收时间
          let deliveredAt: Date | undefined = undefined;
          if (item.receiveTime) {
            try {
              deliveredAt = new Date(item.receiveTime);
            } catch {
              this.logger.warn(`无法解析接收时间: ${item.receiveTime}`);
            }
          }

          return {
            messageId: item.msgId,
            recipientNumber: item.number,
            status,
            deliveredAt: status === 'delivered' ? deliveredAt : undefined,
            errorCode: status === 'failed' ? item.status : undefined,
          };
        });
      } else {
        // 查询失败，返回未知状态
        return messageIds.map((msgId) => ({
          messageId: msgId,
          recipientNumber: '',
          status: 'unknown',
          errorCode: result.status,
          errorMessage: getBukaStatusMessage(result.status) || result.reason,
        }));
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Buka消息状态查询错误: ${errorMessage}`, errorStack);
      return messageIds.map((msgId) => ({
        messageId: msgId,
        recipientNumber: '',
        status: 'unknown',
        errorCode: 'API_ERROR',
        errorMessage: errorMessage,
      }));
    }
  }

  /**
   * 查询消息状态
   * @param messageIds 消息ID列表
   * @returns 消息状态详情数组
   */
  async queryMessageStatus(
    messageIds: string[],
  ): Promise<MessageStatusDetail[]> {
    return this.queryMessageStatusList(messageIds);
  }

  /**
   * 根据消息ID查询短信状态
   * @param messageId 消息ID
   * @param providerMessageId 服务商返回的消息ID
   * @returns 查询结果
   */
  async queryMessageStatusById(
    messageId: number,
    providerMessageId?: string,
  ): Promise<{
    success: boolean;
    status: string;
    statusUpdateTime?: Date;
    errorMessage?: string;
  }> {
    // 如果没有服务商消息ID，则无法查询
    if (!providerMessageId) {
      return {
        success: false,
        status: 'unknown',
        errorMessage: 'No provider message ID available for status query',
      };
    }

    try {
      const config = await this.getChannelConfig(0, 0);
      if (!config) {
        throw new Error('Buka channel configuration not found');
      }

      const { apiKey, apiSecret, appId } = config;

      // 构建 Buka 状态查询请求
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = this.generateSign(apiKey, apiSecret, timestamp);

      const url = `${config.baseUrl}/order/query`;
      const payload = {
        appid: appId,
        apikey: apiKey,
        timestamp: timestamp.toString(),
        sign,
        orderId: providerMessageId,
      };

      this.logger.debug(
        `Querying message status from Buka: ${JSON.stringify(payload)}`,
      );

      const response = await lastValueFrom(
        this.httpService.post<BukaOrderQueryResponse>(url, payload).pipe(
          map((res) => res.data),
          catchError((error: unknown) => {
            const apiError = error as BukaApiError;
            throw new Error(
              `Failed to query message status: ${
                apiError.response?.data?.msg ||
                apiError.message ||
                'Unknown error'
              }`,
            );
          }),
        ),
      );

      this.logger.debug(
        `Buka status query response: ${JSON.stringify(response)}`,
      );

      // 处理响应
      if (response.code === 0) {
        const statusMapping: Record<string, string> = {
          0: 'pending',
          1: 'sent',
          2: 'delivered',
          3: 'failed',
        };

        return {
          success: true,
          status: statusMapping[response.data?.status || ''] || 'unknown',
          statusUpdateTime: new Date(),
        };
      } else {
        return {
          success: false,
          status: 'unknown',
          errorMessage: response.msg || 'Unknown error from Buka API',
        };
      }
    } catch (error) {
      this.logger.error(
        `Error querying message status: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        success: false,
        status: 'unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 查询批次发送状态
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 查询结果
   */
  async queryBatchStatus(
    startTime: Date,
    endTime: Date,
  ): Promise<{
    success: boolean;
    messages?: Array<{
      messageId: string;
      status: string;
      sendTime?: Date;
      deliveredAt?: Date;
      errorMessage?: string;
    }>;
    errorMessage?: string;
  }> {
    try {
      const config = await this.getChannelConfig(0, 0);
      if (!config) {
        throw new Error('Buka channel configuration not found');
      }

      const { apiKey, apiSecret, appId } = config;

      // 构建 Buka 批量状态查询请求
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = this.generateSign(apiKey, apiSecret, timestamp);

      const url = `${config.baseUrl}/order/list`;
      const payload = {
        appid: appId,
        apikey: apiKey,
        timestamp: timestamp.toString(),
        sign,
        startTime: Math.floor(startTime.getTime() / 1000),
        endTime: Math.floor(endTime.getTime() / 1000),
        pageNo: 1,
        pageSize: 100, // 可根据需要调整
      };

      this.logger.debug(
        `Querying batch status from Buka: ${JSON.stringify(payload)}`,
      );

      const response = await lastValueFrom(
        this.httpService.post<BukaBatchQueryResponse>(url, payload).pipe(
          map((res) => res.data),
          catchError((error: unknown) => {
            const apiError = error as BukaApiError;
            throw new Error(
              `Failed to query batch status: ${
                apiError.response?.data?.msg ||
                apiError.message ||
                'Unknown error'
              }`,
            );
          }),
        ),
      );

      this.logger.debug(
        `Buka batch query response: ${JSON.stringify(response)}`,
      );

      // 处理响应
      if (response.code === 0) {
        const statusMapping: Record<string, string> = {
          0: 'pending',
          1: 'sent',
          2: 'delivered',
          3: 'failed',
        };

        const messages = (response.data?.orders || []).map((order) => ({
          messageId: order.orderId,
          status: statusMapping[order.status || ''] || 'unknown',
          sendTime: order.sentTime
            ? new Date(order.sentTime * 1000)
            : undefined,
          deliveredAt: order.deliveredTime
            ? new Date(order.deliveredTime * 1000)
            : undefined,
          errorMessage: order.error || undefined,
        }));

        return {
          success: true,
          messages,
        };
      } else {
        return {
          success: false,
          errorMessage: response.msg || 'Unknown error from Buka API',
        };
      }
    } catch (error) {
      this.logger.error(
        `Error querying batch status: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 根据时间范围查询批次结果
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param batchIds 批次ID数组(可选)
   * @returns 批次查询结果
   */
  async queryBatchByTimeRange(
    startTime: Date,
    endTime: Date,
    batchIds?: string[],
  ): Promise<BatchQueryResult[]> {
    try {
      const config = await this.getChannelConfig(0, 0);
      const headers = this.getRequestHeaders(config.apiKey, config.apiSecret);
      const url = `${config.baseUrl}/v3/getSentRcd`;

      // 格式化日期为ISO8601格式
      const startTimeStr = startTime.toISOString();
      const endTimeStr = endTime.toISOString();

      const payload = {
        appId: config.appId,
        startTime: startTimeStr,
        endTime: endTimeStr,
        startIndex: 0, // 从第一条开始查询
      };

      this.logger.debug(`查询Buka时间范围内的短信: ${JSON.stringify(payload)}`);

      const response = await lastValueFrom(
        this.httpService.post(url, payload, { headers }),
      );

      const result = response.data as BukaApiResponse;
      this.logger.debug(`Buka时间范围短信查询结果: ${JSON.stringify(result)}`);

      if (result.status === BukaStatusCodes.SUCCESS) {
        // 如果没有指定批次ID，我们假设所有返回结果属于同一批次
        // 实际项目中，需要根据orderId或其他信息将结果分组到不同批次

        // 统计不同状态的消息数量
        let successCount = 0;
        let failCount = 0;
        let pendingCount = 0;

        const details: MessageStatusDetail[] = [];

        if (result.array && result.array.length > 0) {
          result.array.forEach((item) => {
            let status: MessageStatusDetail['status'] = 'unknown';

            // 转换Buka状态为我们的标准状态
            switch (item.status) {
              case '0':
                status = 'delivered';
                successCount++;
                break;
              case '1':
                status = 'submitted';
                pendingCount++;
                break;
              case '-1':
                status = 'failed';
                failCount++;
                break;
              default:
                status = 'unknown';
                pendingCount++;
            }

            // 解析接收时间
            let deliveredAt: Date | undefined = undefined;
            if (item.receiveTime) {
              try {
                deliveredAt = new Date(item.receiveTime);
              } catch {
                this.logger.warn(`无法解析接收时间: ${item.receiveTime}`);
              }
            }

            details.push({
              messageId: item.msgId,
              recipientNumber: item.number,
              status,
              deliveredAt: status === 'delivered' ? deliveredAt : undefined,
              errorCode: status === 'failed' ? item.status : undefined,
            });
          });
        }

        // 确定批次状态
        let batchStatus: BatchQueryResult['status'];
        if (pendingCount > 0) {
          batchStatus = 'processing';
        } else if (failCount === 0) {
          batchStatus = 'completed';
        } else if (successCount === 0) {
          batchStatus = 'failed';
        } else {
          batchStatus = 'partially_completed';
        }

        // 创建一个批次结果
        const batchResult: BatchQueryResult = {
          batchId: batchIds?.[0] || 'unknown',
          totalCount: successCount + failCount + pendingCount,
          successCount,
          failCount,
          pendingCount,
          status: batchStatus,
          details,
        };

        return [batchResult];
      } else {
        // 查询失败
        const errorBatchResult: BatchQueryResult = {
          batchId: batchIds?.[0] || 'unknown',
          totalCount: 0,
          successCount: 0,
          failCount: 0,
          pendingCount: 0,
          status: 'failed',
          details: [],
        };
        return [errorBatchResult];
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Buka时间范围短信查询错误: ${errorMessage}`,
        errorStack,
      );
      const errorBatchResult: BatchQueryResult = {
        batchId: batchIds?.[0] || 'unknown',
        totalCount: 0,
        successCount: 0,
        failCount: 0,
        pendingCount: 0,
        status: 'failed',
        details: [],
      };
      return [errorBatchResult];
    }
  }

  /**
   * 获取该渠道支持的国家列表
   * @returns 支持的国家信息数组
   */
  async getSupportedCountries(): Promise<CountryInfo[]> {
    try {
      const countries = await this.supportedCountryRepository.find({
        where: { channel: this.getChannelCode(), isActive: true },
      });

      return countries.map((country) => ({
        code: country.countryCode,
        dialCode: country.dialCode,
      }));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `获取Buka支持的国家列表失败: ${errorMessage}`,
        errorStack,
      );
      return [];
    }
  }

  /**
   * 验证渠道配置是否有效
   * @returns 配置是否有效
   */
  async validateConfig(): Promise<boolean> {
    try {
      const config = await this.getChannelConfig(0, 0);

      if (!config.apiKey || !config.apiSecret || !config.appId) {
        return false;
      }

      const headers = this.getRequestHeaders(config.apiKey, config.apiSecret);
      const url = `${config.baseUrl}/v3/getSentRcd`;

      // 只查询一条记录，用于验证配置是否有效
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1小时前

      const payload = {
        appId: config.appId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        startIndex: 0,
      };

      const response = await lastValueFrom(
        this.httpService.post(url, payload, { headers }),
      );

      const result = response.data as BukaApiResponse;
      return result.status === BukaStatusCodes.SUCCESS;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`验证Buka配置失败: ${errorMessage}`, errorStack);
      return false;
    }
  }

  /**
   * 获取账户余额
   * @returns 余额信息
   */
  async getBalance(): Promise<BukaBalanceResponse> {
    try {
      const config = await this.getChannelConfig(0, 0);
      const headers = this.getRequestHeaders(config.apiKey, config.apiSecret);
      const url = `${config.baseUrl}/v3/getBalance`;

      this.logger.debug('查询 Buka 账户余额');

      const response = await lastValueFrom(
        this.httpService.get(url, { headers }),
      );

      const result = response.data as BukaBalanceResponse;
      this.logger.debug(`Buka 余额查询结果: ${JSON.stringify(result)}`);

      if (result.status === '0') {
        // 按照 270:400 的比例转换余额
        const originalBalance = parseFloat(result.balance);
        const convertedBalance = Math.round((originalBalance / 270) * 400);

        return {
          status: result.status,
          reason: result.reason,
          balance: convertedBalance.toString(),
          gift: result.gift,
          credit: result.credit,
        };
      }

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`查询 Buka 余额失败: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
