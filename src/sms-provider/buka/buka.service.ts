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
import { SmsProvider } from '../../sms-provider/entities/sms-provider.entity';

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

// Buka发送短信响应接口
interface BukaSendResponse {
  status: string;
  reason: string;
  success?: string;
  fail?: string;
  array?: Array<{
    msgId?: string;
    msgid?: string;
    number: string;
    orderId?: string;
  }>;
}

// 添加Buka短信查询接口的响应类型定义
interface BukaMessageStatusResponse {
  status: string;
  reason: string;
  success?: string;
  fail?: string;
  sending?: string;
  nofound?: string;
  array?: Array<{
    msgId: string;
    number: string;
    receiveTime: string;
    status: string;
  }>;
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
    @InjectRepository(SmsProvider)
    private readonly smsProviderRepository: Repository<SmsProvider>,
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

    // 从sms_providers表获取系统级的Buka基础配置（baseUrl）
    const provider = await this.smsProviderRepository.findOne({
      where: {
        name: 'onbuka',
        isActive: true,
      },
    });

    if (!provider || !provider.baseUrl) {
      throw new Error(
        'Buka provider base configuration not found or incomplete',
      );
    }

    // 从tenant_channel_configs表获取租户级的Buka认证信息（apiKey和apiSecret）
    const tenantConfig = await this.tenantChannelConfigRepository.findOne({
      where: {
        tenantId,
        channel: 'onbuka',
        isActive: true,
      },
    });

    if (!tenantConfig || !tenantConfig.apiKey || !tenantConfig.apiSecret) {
      throw new Error('Buka authentication is not configured for this tenant');
    }

    // 获取用户渠道配置（appId）
    const userConfig = await this.userChannelConfigRepository.findOne({
      where: { userId, channel: 'onbuka', isActive: true },
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

    // 组合来自不同表的配置信息
    const credentials: BukaCredentials = {
      apiKey: tenantConfig.apiKey,
      apiSecret: tenantConfig.apiSecret,
      baseUrl: provider.baseUrl,
      appId,
    };

    this.logger.debug(
      `Loaded credentials from DB: apiKey=${credentials.apiKey.substring(0, 3)}***, baseUrl=${credentials.baseUrl}, appId=${credentials.appId}`,
    );

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

  /**
   * 获取账户余额
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @returns 余额信息
   */
  async getBalance(
    tenantIdOrAppId: number | string,
    userId?: number,
  ): Promise<{ balance: number }> {
    // 如果tenantIdOrAppId是字符串，则直接以appId调用API
    if (typeof tenantIdOrAppId === 'string') {
      // 根据appId找到对应的配置
      const config = await this.tenantChannelConfigRepository.findOne({
        where: {
          configDetails: { appId: tenantIdOrAppId },
          channel: 'onbuka',
          isActive: true,
        },
      });

      if (!config) {
        throw new Error(
          `No active Buka configuration found for appId: ${tenantIdOrAppId}`,
        );
      }

      try {
        const headers = this.getRequestHeaders(config.apiKey, config.apiSecret);
        // 确保baseUrl不以斜杠结尾，并在路径前添加斜杠
        const baseUrl =
          config.configDetails &&
          typeof config.configDetails === 'object' &&
          typeof config.configDetails.baseUrl === 'string'
            ? config.configDetails.baseUrl.endsWith('/')
              ? config.configDetails.baseUrl.slice(0, -1)
              : config.configDetails.baseUrl
            : 'https://api.onbuka.com';
        const url = `${baseUrl}/v3/getBalance`;

        this.logger.log(
          `Requesting Buka balance from URL: ${url} for appId: ${tenantIdOrAppId}`,
        );
        this.logger.debug(
          `Request headers: ${JSON.stringify(headers, null, 2)}`,
        );

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
    } else {
      // 原有逻辑，通过tenantId和userId加载凭证
      const credentials = await this.loadCredentials(
        tenantIdOrAppId,
        userId ?? 1, // 如果userId未定义，使用默认值1
      );

      try {
        const headers = this.getRequestHeaders(
          credentials.apiKey,
          credentials.apiSecret,
        );
        // 确保baseUrl不以斜杠结尾，并在路径前添加斜杠
        const baseUrl = credentials.baseUrl.endsWith('/')
          ? credentials.baseUrl.slice(0, -1)
          : credentials.baseUrl;
        const url = `${baseUrl}/v3/getBalance`;

        this.logger.log(`Requesting Buka balance from URL: ${url}`);
        this.logger.debug(
          `Request headers: ${JSON.stringify(headers, null, 2)}`,
        );

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

  /**
   * 发送单条短信
   * @param messageId 短信ID
   * @param recipient 接收者手机号
   * @param content 短信内容
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @returns 发送结果
   */
  async send(
    messageId: number,
    recipient: string,
    content: string,
    tenantId: number,
    userId: number,
  ): Promise<{
    success: boolean;
    providerMessageId?: string;
    errorMessage?: string;
  }> {
    try {
      // 加载凭证
      const credentials = await this.loadCredentials(tenantId, userId);

      // 生成请求头
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );

      // 确保baseUrl不以斜杠结尾
      const baseUrl = credentials.baseUrl.endsWith('/')
        ? credentials.baseUrl.slice(0, -1)
        : credentials.baseUrl;

      const url = `${baseUrl}/v3/sendSms`;

      // 构建请求体
      const requestBody = {
        appId: credentials.appId,
        numbers: recipient,
        content: content,
        orderId: String(messageId),
      };

      this.logger.debug(`Sending SMS to Buka: ${JSON.stringify(requestBody)}`);

      // 发送请求
      const response = await axios.post<BukaSendResponse>(url, requestBody, {
        headers,
      });
      const responseData = response.data;

      this.logger.debug(`Buka response: ${JSON.stringify(responseData)}`);

      // 处理响应
      if (
        responseData.status === '0' &&
        responseData.array &&
        responseData.array.length > 0
      ) {
        // 成功情况
        return {
          success: true,
          providerMessageId:
            responseData.array[0].msgId || responseData.array[0].msgid,
        };
      } else {
        // 失败情况
        return {
          success: false,
          errorMessage: `Buka submission failed. Status: ${responseData.status}, Reason: ${responseData.reason}`,
        };
      }
    } catch (error) {
      // 处理异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending SMS via Buka: ${errorMessage}`);

      if (error instanceof AxiosError) {
        const responseData = error.response?.data as
          | BukaErrorResponse
          | undefined;
        this.logger.error(
          `Full error details: ${JSON.stringify({
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: responseData,
          })}`,
        );
      }

      return {
        success: false,
        errorMessage: `Buka API error: ${errorMessage}`,
      };
    }
  }

  /**
   * 批量发送短信
   * @param messages 消息列表 [{messageId, recipient}]
   * @param content 短信内容
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @returns 批量发送结果
   */
  async sendSmsBatch(
    messages: Array<{ id: number; recipientNumber: string }>,
    content: string,
    tenantId: number,
    userId: number,
  ): Promise<{
    submitted: Array<{ id: number; providerMessageId?: string }>;
    failed: Array<{ id: number; errorMessage: string }>;
  }> {
    try {
      // 加载凭证
      const credentials = await this.loadCredentials(tenantId, userId);

      // 生成请求头
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );

      // 确保baseUrl不以斜杠结尾
      const baseUrl = credentials.baseUrl.endsWith('/')
        ? credentials.baseUrl.slice(0, -1)
        : credentials.baseUrl;

      const url = `${baseUrl}/v3/sendSms`;

      // 合并所有手机号码
      const recipientNumbers = messages
        .map((msg) => msg.recipientNumber)
        .join(',');
      // 合并所有消息ID作为订单ID
      const orderIds = messages.map((msg) => String(msg.id)).join(',');

      // 构建请求体
      const requestBody = {
        appId: credentials.appId,
        numbers: recipientNumbers,
        content: content,
        orderId: orderIds,
      };

      this.logger.debug(
        `Sending batch SMS to Buka: ${JSON.stringify(requestBody)}`,
      );

      // 发送请求
      const response = await axios.post<BukaSendResponse>(url, requestBody, {
        headers,
      });
      const responseData = response.data;

      this.logger.debug(`Buka batch response: ${JSON.stringify(responseData)}`);

      const submitted: Array<{ id: number; providerMessageId?: string }> = [];
      const failed: Array<{ id: number; errorMessage: string }> = [];

      // 处理响应
      if (responseData.status === '0' && responseData.array) {
        // 创建消息ID到提供商消息ID的映射
        const resultMap = new Map<string, string>();
        responseData.array.forEach((item) => {
          const msgId = item.msgId || item.msgid;
          if (item.orderId && msgId) {
            resultMap.set(item.orderId, msgId);
          }
        });

        // 处理每条消息的结果
        messages.forEach((msg) => {
          const providerMessageId = resultMap.get(String(msg.id));
          if (providerMessageId) {
            submitted.push({
              id: msg.id,
              providerMessageId,
            });
          } else {
            failed.push({
              id: msg.id,
              errorMessage: `Buka response did not include msgId for orderId ${msg.id}`,
            });
          }
        });
      } else {
        // 全部失败
        const errorMessage = `Buka batch submission failed. Status: ${responseData.status}, Reason: ${responseData.reason}`;
        this.logger.error(errorMessage);
        messages.forEach((msg) => {
          failed.push({
            id: msg.id,
            errorMessage: errorMessage,
          });
        });
      }

      return { submitted, failed };
    } catch (error) {
      // 处理异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending batch SMS via Buka: ${errorMessage}`);

      // 如果是Axios错误，记录详细信息
      if (error instanceof AxiosError) {
        const responseData = error.response?.data as
          | BukaErrorResponse
          | undefined;
        this.logger.error(
          `Full error details: ${JSON.stringify({
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: responseData,
          })}`,
        );
      }

      // 所有消息都标记为失败
      const failed = messages.map((msg) => ({
        id: msg.id,
        errorMessage: `Buka API error: ${errorMessage}`,
      }));

      return { submitted: [], failed };
    }
  }

  /**
   * 通过消息ID列表查询短信状态
   * @param msgIds 提供商消息ID列表
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @returns 查询结果
   */
  async queryMessageStatusByIds(
    msgIds: string[],
    tenantId: number,
    userId: number,
  ): Promise<{
    results: Array<{
      messageId: string;
      recipientNumber: string;
      status: 'delivered' | 'sending' | 'failed' | 'unknown';
      sendTime?: Date;
    }>;
    totalSuccess: number;
    totalFail: number;
    totalSending: number;
    totalNotFound: number;
  }> {
    try {
      if (!msgIds || msgIds.length === 0) {
        return {
          results: [],
          totalSuccess: 0,
          totalFail: 0,
          totalSending: 0,
          totalNotFound: 0,
        };
      }

      // 限制单次请求的消息ID数量
      if (msgIds.length > 200) {
        this.logger.warn(
          `查询的msgIds数量(${msgIds.length})超过Buka限制(200)，将截断请求`,
        );
        msgIds = msgIds.slice(0, 200);
      }

      // 加载凭证
      const credentials = await this.loadCredentials(tenantId, userId);

      // 生成请求头
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );

      // 确保baseUrl不以斜杠结尾
      const baseUrl = credentials.baseUrl.endsWith('/')
        ? credentials.baseUrl.slice(0, -1)
        : credentials.baseUrl;

      // 构建URL（Buka查询短信状态的API地址）
      const url = `${baseUrl}/v3/querySms`;

      // 构建查询参数
      const params = {
        appId: credentials.appId,
        msgIds: msgIds.join(','),
      };

      this.logger.debug(`查询Buka短信状态: ${JSON.stringify(params)}`);

      // 发送查询请求
      const response = await axios.get<BukaMessageStatusResponse>(url, {
        headers,
        params,
      });

      const responseData = response.data;
      this.logger.debug(
        `Buka短信状态查询响应: ${JSON.stringify(responseData)}`,
      );

      // 处理响应
      const results: Array<{
        messageId: string;
        recipientNumber: string;
        status: 'delivered' | 'sending' | 'failed' | 'unknown';
        sendTime?: Date;
      }> = [];
      let totalSuccess = 0;
      let totalFail = 0;
      let totalSending = 0;
      let totalNotFound = 0;

      // 解析响应中的数量统计
      if (responseData.success)
        totalSuccess = parseInt(responseData.success, 10) || 0;
      if (responseData.fail) totalFail = parseInt(responseData.fail, 10) || 0;
      if (responseData.sending)
        totalSending = parseInt(responseData.sending, 10) || 0;
      if (responseData.nofound)
        totalNotFound = parseInt(responseData.nofound, 10) || 0;

      // 解析响应中的详细状态数组
      if (responseData.array && responseData.array.length > 0) {
        responseData.array.forEach((item) => {
          // 将Buka的状态码转换为标准状态
          let standardStatus: 'delivered' | 'sending' | 'failed' | 'unknown';

          switch (item.status) {
            case '0':
              standardStatus = 'delivered'; // 成功
              break;
            case '-1':
              standardStatus = 'sending'; // 发送中
              break;
            case '1':
              standardStatus = 'failed'; // 失败
              break;
            default:
              standardStatus = 'unknown'; // 未知
          }

          // 转换接收时间
          let sendTime = undefined;
          if (item.receiveTime) {
            try {
              sendTime = new Date(item.receiveTime);
            } catch (_) {
              this.logger.warn(`无法解析接收时间: ${item.receiveTime}`);
            }
          }

          // 添加到结果数组
          results.push({
            messageId: item.msgId,
            recipientNumber: item.number,
            status: standardStatus,
            sendTime,
          });
        });
      }

      return {
        results,
        totalSuccess,
        totalFail,
        totalSending,
        totalNotFound,
      };
    } catch (error) {
      // 处理异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`查询Buka短信状态时出错: ${errorMessage}`);

      if (error instanceof AxiosError) {
        const responseData = error.response?.data as
          | BukaErrorResponse
          | undefined;
        this.logger.error(
          `完整错误详情: ${JSON.stringify({
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: responseData,
          })}`,
        );
      }

      throw new Error(`Buka API查询错误: ${errorMessage}`);
    }
  }

  /**
   * 按时间范围查询短信状态
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param startIndex 起始索引
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @returns 查询结果
   */
  async queryMessageStatusByTimeRange(
    startTime: Date,
    endTime: Date,
    startIndex: number = 0,
    tenantId: number,
    userId: number,
  ): Promise<{
    results: Array<{
      messageId: string;
      recipientNumber: string;
      status: 'delivered' | 'sending' | 'failed' | 'unknown';
      sendTime?: Date;
    }>;
    totalSuccess: number;
    totalFail: number;
  }> {
    try {
      // 验证时间范围
      if (startTime > endTime) {
        throw new Error('开始时间不能晚于结束时间');
      }

      // 加载凭证
      const credentials = await this.loadCredentials(tenantId, userId);

      // 生成请求头
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );

      // 确保baseUrl不以斜杠结尾
      const baseUrl = credentials.baseUrl.endsWith('/')
        ? credentials.baseUrl.slice(0, -1)
        : credentials.baseUrl;

      // 构建URL（Buka查询时间范围内短信的API地址）
      const url = `${baseUrl}/v3/getSentRcd`;

      console.log('Buka查询时间范围内短信的API地址:', url);
      console.log('Buka查询时间范围内短信的API地址:', url);
      console.log('Buka查询时间范围内短信的API地址:', url);
      console.log('Buka查询时间范围内短信的API地址:', url);
      console.log('Buka查询时间范围内短信的API地址:', url);
      console.log('Buka查询时间范围内短信的API地址:', url);

      // 将时间转换为ISO8601格式
      const formatDate = (date: Date): string => {
        return date.toISOString().slice(0, -5) + 'Z'; // 移除毫秒部分并添加Z表示UTC
      };

      // 构建查询参数
      const params = {
        appId: credentials.appId,
        startTime: formatDate(startTime),
        endTime: formatDate(endTime),
        startIndex: startIndex.toString(),
      };

      this.logger.debug(`按时间范围查询Buka短信: ${JSON.stringify(params)}`);

      // 发送查询请求
      const response = await axios.get<BukaMessageStatusResponse>(url, {
        headers,
        params,
      });

      const responseData = response.data;
      this.logger.debug(
        `Buka时间范围查询响应: ${JSON.stringify(responseData)}`,
      );

      // 处理响应
      const results: Array<{
        messageId: string;
        recipientNumber: string;
        status: 'delivered' | 'sending' | 'failed' | 'unknown';
        sendTime?: Date;
      }> = [];
      let totalSuccess = 0;
      let totalFail = 0;

      // 解析响应中的数量统计
      if (responseData.success)
        totalSuccess = parseInt(responseData.success, 10) || 0;
      if (responseData.fail) totalFail = parseInt(responseData.fail, 10) || 0;

      // 解析响应中的详细状态数组
      if (responseData.array && responseData.array.length > 0) {
        responseData.array.forEach((item) => {
          // 将Buka的状态码转换为标准状态
          let standardStatus: 'delivered' | 'sending' | 'failed' | 'unknown';

          switch (item.status) {
            case '0':
              standardStatus = 'delivered'; // 成功
              break;
            case '-1':
              standardStatus = 'sending'; // 发送中
              break;
            case '1':
              standardStatus = 'failed'; // 失败
              break;
            default:
              standardStatus = 'unknown'; // 未知
          }

          // 转换接收时间
          let sendTime = undefined;
          if (item.receiveTime) {
            try {
              sendTime = new Date(item.receiveTime);
            } catch (_) {
              this.logger.warn(`无法解析接收时间: ${item.receiveTime}`);
            }
          }

          // 添加到结果数组
          results.push({
            messageId: item.msgId,
            recipientNumber: item.number,
            status: standardStatus,
            sendTime,
          });
        });
      }

      return {
        results,
        totalSuccess,
        totalFail,
      };
    } catch (error) {
      // 处理异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`按时间范围查询Buka短信状态时出错: ${errorMessage}`);

      if (error instanceof AxiosError) {
        const responseData = error.response?.data as
          | BukaErrorResponse
          | undefined;
        this.logger.error(
          `完整错误详情: ${JSON.stringify({
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: responseData,
          })}`,
        );
      }

      throw new Error(`Buka API时间范围查询错误: ${errorMessage}`);
    }
  }
}
