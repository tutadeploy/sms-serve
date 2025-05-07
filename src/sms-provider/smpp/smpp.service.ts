import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { TenantChannelConfig } from '../../sms-channel-config/entities/tenant-channel-config.entity';
import { UserChannelConfig } from '../../sms-channel-config/entities/user-channel-config.entity';
import { SmsProvider } from '../entities/sms-provider.entity';
import { SmppBaseService } from './smpp-base.service';

// 定义凭证接口，用于SmppService内部管理从数据库加载的特定于租户/用户的凭证
interface SmppCredentials {
  apiKey: string;
  apiSecret: string;
  appId: string; // appId 从 UserChannelConfig 或 TenantChannelConfig 中获取
  // baseUrl 从 SmppBaseService 的 smsProviderRepository 加载，此处不重复
}

// 定义余额查询响应接口
interface SmppBalanceResponse {
  code: string | number;
  status?: string;
  reason?: string;
  message?: string;
  data?: {
    balance?: number;
  };
  balance?: number; // 有些API可能直接在根节点返回balance
}

// 定义错误响应接口
interface SmppErrorResponse {
  code?: string | number;
  status?: string;
  reason?: string;
  message?: string;
}

// 定义短信发送响应接口
interface SmppSendResponse {
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

// 定义短信状态查询响应接口
interface SmppMessageStatusResponse {
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

// 为 getSentRecords 的响应数据定义更具体的类型
interface SmppSentRecordItem {
  messageId?: string;
  msgId?: string; // 兼容两种可能的字段名
  recipientNumber?: string;
  number?: string; // 兼容两种可能的字段名
  content?: string;
  status?: string;
  sendTime?: string | number | Date; // API可能返回不同类型的时间戳
}

interface SmppGetSentRecordsResponse {
  status?: string | number;
  code?: string | number;
  reason?: string;
  message?: string;
  total?: number;
  records?: SmppSentRecordItem[];
}

@Injectable()
export class SmppService extends SmppBaseService {
  private readonly serviceLogger = new Logger(SmppService.name);
  private readonly CACHE_TTL = 300; // 5 minutes cache, consistent with BukaService

  constructor(
    // 基础配置（如baseUrl）通过父类的 smsProviderRepository 加载
    @InjectRepository(SmsProvider)
    protected readonly smsProviderRepository: Repository<SmsProvider>,
    protected readonly httpService: HttpService,

    // 特定渠道的认证信息 (apiKey, apiSecret, appId)
    @InjectRepository(TenantChannelConfig)
    private readonly tenantChannelConfigRepository: Repository<TenantChannelConfig>,
    @InjectRepository(UserChannelConfig)
    private readonly userChannelConfigRepository: Repository<UserChannelConfig>,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    super(smsProviderRepository, httpService);
    // 在构造函数中预加载基础配置 (baseUrl)
    this.loadBaseConfig('smpp').catch((err) => {
      this.serviceLogger.error('Failed to preload SMPP base config', err);
    });
  }

  private getCacheKey(tenantId: number, userId?: number): string {
    // userId 是可选的，因为可能只有租户级别的配置
    return `smpp_credentials:${tenantId}:${userId || 'tenant'}`;
  }

  // 加载特定于租户/用户的凭证 (apiKey, apiSecret, appId)
  private async loadSmppCredentials(
    tenantId: number,
    userId?: number, // userId is optional
  ): Promise<SmppCredentials> {
    const cacheKey = this.getCacheKey(tenantId, userId);
    try {
      const cachedCredentials =
        await this.cacheManager.get<SmppCredentials>(cacheKey);
      if (cachedCredentials) {
        this.serviceLogger.debug(
          `Credentials found in cache for key: ${cacheKey}`,
        );
        return cachedCredentials;
      }
    } catch (cacheError) {
      this.serviceLogger.error(
        `Failed to get cache for key ${cacheKey}`,
        cacheError,
      );
    }

    const tenantConfig = await this.tenantChannelConfigRepository.findOne({
      where: {
        tenantId,
        channel: 'smpp',
        isActive: true,
      },
    });

    if (!tenantConfig || !tenantConfig.apiKey || !tenantConfig.apiSecret) {
      this.serviceLogger.error(
        `SMPP authentication (apiKey/apiSecret) is not configured or inactive for tenantId: ${tenantId}`,
      );
      throw new Error('SMPP authentication is not configured for this tenant');
    }

    let appId: string | undefined;
    // 优先从 UserChannelConfig 获取 appId
    if (userId) {
      const userConfig = await this.userChannelConfigRepository.findOne({
        where: { userId, channel: 'smpp', isActive: true },
      });
      if (
        userConfig?.configDetails &&
        typeof userConfig.configDetails.appId === 'string'
      ) {
        appId = userConfig.configDetails.appId;
        this.serviceLogger.debug(
          `Found appId in user config for userId ${userId}: ${appId}`,
        );
      }
    }

    // 如果用户配置中没有，则从 TenantChannelConfig 的 configDetails 获取 appId
    if (
      !appId &&
      tenantConfig.configDetails &&
      typeof tenantConfig.configDetails.appId === 'string'
    ) {
      appId = tenantConfig.configDetails.appId;
      this.serviceLogger.debug(
        `Using tenant appId as fallback for tenantId ${tenantId}: ${appId}`,
      );
    }

    if (!appId) {
      this.serviceLogger.error(
        `No appId found in user or tenant channel config for tenantId: ${tenantId} (userId: ${userId})`,
      );
      throw new Error('No appId found for SMPP channel');
    }

    const credentials: SmppCredentials = {
      apiKey: tenantConfig.apiKey,
      apiSecret: tenantConfig.apiSecret,
      appId: appId,
    };

    try {
      await this.cacheManager.set(cacheKey, credentials, this.CACHE_TTL);
      this.serviceLogger.debug(`Credentials set in cache for key: ${cacheKey}`);
    } catch (cacheError) {
      this.serviceLogger.error(
        `Failed to set cache for key ${cacheKey}`,
        cacheError,
      );
    }

    return credentials;
  }

  /**
   * 获取账户余额
   * @param tenantIdOrAppId 租户ID或AppID
   * @param userId 用户ID (可选)
   * @returns 账户余额对象 { balance: number }
   */
  async getBalance(
    tenantIdOrAppId: number | string,
    userId?: number,
  ): Promise<{ balance: number }> {
    this.serviceLogger.log(
      `getBalance called with tenantIdOrAppId: ${tenantIdOrAppId}, userId: ${userId}`,
    );

    try {
      let credentials: SmppCredentials;

      if (typeof tenantIdOrAppId === 'string') {
        // 方式1：直接使用AppID
        const tenantConfig = await this.tenantChannelConfigRepository.findOne({
          where: {
            configDetails: { appId: tenantIdOrAppId },
            channel: 'smpp',
            isActive: true,
          },
        });

        if (!tenantConfig || !tenantConfig.apiKey || !tenantConfig.apiSecret) {
          throw new Error(
            `No active SMPP configuration found for appId: ${tenantIdOrAppId}`,
          );
        }

        credentials = {
          apiKey: tenantConfig.apiKey,
          apiSecret: tenantConfig.apiSecret,
          appId: tenantIdOrAppId,
        };

        this.serviceLogger.debug(
          `Using credentials for appId: ${tenantIdOrAppId}`,
        );
      } else {
        // 方式2：使用租户ID + 用户ID
        credentials = await this.loadSmppCredentials(tenantIdOrAppId, userId);
        this.serviceLogger.debug(
          `Using credentials for tenantId: ${tenantIdOrAppId}, userId: ${userId || 'N/A'}`,
        );
      }

      // 准备请求
      if (!this.baseUrl) {
        await this.loadBaseConfig('smpp');
      }

      // 构建请求URL
      // 如果需要将appId作为查询参数，则需要在URL中添加
      const url = `${this.baseUrl}/api/v1/getBalance`;
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );

      this.serviceLogger.debug(`Requesting balance from URL: ${url}`);

      // 发起请求
      const response = await axios.get<SmppBalanceResponse>(url, {
        headers,
        params: { appId: credentials.appId }, // 将appId作为查询参数
      });

      const responseData = response.data;
      this.serviceLogger.debug(
        `Balance response: ${JSON.stringify(responseData)}`,
      );

      // 处理响应
      if (responseData.status === '-1' || responseData.code === '-1') {
        const errorMessage = `SMPP API error: ${responseData.reason || responseData.message || 'Unknown error'}`;
        this.serviceLogger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // 提取余额
      let balance = 0;

      if (
        typeof responseData.balance === 'number' ||
        typeof responseData.balance === 'string'
      ) {
        balance = Number(responseData.balance);
      } else if (responseData.data?.balance !== undefined) {
        balance = Number(responseData.data.balance);
      } else {
        const errorMessage = `Unexpected SMPP response format, cannot find balance: ${JSON.stringify(responseData)}`;
        this.serviceLogger.error(errorMessage);
        throw new Error(errorMessage);
      }

      this.serviceLogger.log(`SMPP balance retrieved: ${balance}`);

      // 返回余额
      return { balance };
    } catch (error) {
      // 处理错误
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<SmppErrorResponse>;
        const responseData = axiosError.response?.data;
        const errorMessage = `SMPP API error during getBalance: ${
          responseData?.message ||
          responseData?.reason ||
          axiosError.message ||
          'Unknown error'
        }`;
        this.serviceLogger.error(errorMessage);
        this.serviceLogger.error(
          `Full error details: ${JSON.stringify({
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: responseData,
          })}`,
        );
        throw new Error(errorMessage);
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error during SMPP getBalance';
      this.serviceLogger.error(`Unexpected error: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.serviceLogger.error(`Stack trace: ${error.stack}`);
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * 生成请求头
   * 辅助方法，用于生成API请求头
   */
  private getRequestHeaders(
    apiKey: string,
    apiSecret: string,
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSign(apiKey, apiSecret, timestamp);

    return {
      'Content-Type': 'application/json;charset=UTF-8',
      'Api-Key': apiKey,
      Sign: sign,
      Timestamp: timestamp.toString(),
    };
  }

  /**
   * 生成签名
   * 辅助方法，用于生成API签名
   */
  private generateSign(
    apiKey: string,
    apiSecret: string,
    timestamp: number,
  ): string {
    const signStr = `${apiKey}${apiSecret}${timestamp}`;
    this.serviceLogger.debug(`Generating sign with message: ${signStr}`);
    return crypto.createHash('md5').update(signStr).digest('hex');
  }

  /**
   * 发送单条短信
   * @param messageId 短信ID (用于跟踪)
   * @param recipient 收件人手机号
   * @param content 短信内容
   * @param tenantId 租户ID
   * @param userId 用户ID (可选)
   * @returns 发送结果对象 { success: boolean, providerMessageId?: string, errorMessage?: string }
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
    this.serviceLogger.log(
      `Sending SMS to ${recipient}, messageId: ${messageId}, tenantId: ${tenantId}, userId: ${userId}`,
    );

    try {
      // 加载凭证
      const credentials = await this.loadSmppCredentials(tenantId, userId);

      // 确保baseUrl已加载
      if (!this.baseUrl) {
        await this.loadBaseConfig('smpp');
      }

      // 生成请求头
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );

      // 构建请求URL
      const url = `${this.baseUrl}/api/v1/sendSms`;

      // 构建请求体
      const requestBody = {
        appId: credentials.appId,
        numbers: recipient,
        content: content,
        orderId: String(messageId), // 确保orderId为字符串
      };

      this.serviceLogger.debug(
        `Sending SMS request: ${JSON.stringify(requestBody)}`,
      );

      // 发送请求
      const response = await axios.post<SmppSendResponse>(url, requestBody, {
        headers,
      });

      const responseData = response.data;
      this.serviceLogger.debug(
        `Send SMS response: ${JSON.stringify(responseData)}`,
      );

      // 处理响应
      if (
        responseData.status === '0' &&
        responseData.array &&
        responseData.array.length > 0
      ) {
        // 发送成功
        const msgId =
          responseData.array[0].msgId || responseData.array[0].msgid;
        this.serviceLogger.log(
          `SMS sent successfully, providerMessageId: ${msgId}`,
        );

        return {
          success: true,
          providerMessageId: msgId,
        };
      } else {
        // 发送失败
        const errorMessage = responseData.reason || 'Unknown error';
        this.serviceLogger.warn(`SMS sending failed: ${errorMessage}`);

        return {
          success: false,
          errorMessage: errorMessage,
        };
      }
    } catch (error) {
      // 处理异常
      let errorMessage: string;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<SmppErrorResponse>;
        const responseData = axiosError.response?.data;

        errorMessage = `SMPP API error during send: ${
          responseData?.message ||
          responseData?.reason ||
          axiosError.message ||
          'Unknown error'
        }`;

        this.serviceLogger.error(errorMessage);
        this.serviceLogger.error(
          `Full error details: ${JSON.stringify({
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: responseData,
          })}`,
        );
      } else {
        errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error during SMPP send';

        this.serviceLogger.error(`Unexpected error: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          this.serviceLogger.error(`Stack trace: ${error.stack}`);
        }
      }

      return {
        success: false,
        errorMessage: errorMessage,
      };
    }
  }

  /**
   * 批量发送短信
   * @param messages 短信信息数组，每项包含id和接收者号码
   * @param content 短信内容（所有短信使用同一内容）
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @returns 批量发送结果，包含成功和失败的消息列表
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
    this.serviceLogger.log(
      `Batch sending SMS, count: ${messages.length}, tenantId: ${tenantId}, userId: ${userId}`,
    );

    // 初始化返回对象
    const result = {
      submitted: [] as Array<{ id: number; providerMessageId?: string }>,
      failed: [] as Array<{ id: number; errorMessage: string }>,
    };

    try {
      // 如果没有消息，直接返回
      if (!messages || messages.length === 0) {
        this.serviceLogger.warn('No messages to send');
        return result;
      }

      // 加载凭证
      const credentials = await this.loadSmppCredentials(tenantId, userId);

      // 确保baseUrl已加载
      if (!this.baseUrl) {
        await this.loadBaseConfig('smpp');
      }

      // 生成请求头
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );

      // 构建请求URL
      const url = `${this.baseUrl}/api/v1/batchSendSms`;

      // 构建请求体 - 将所有收件人和订单ID合并为逗号分隔的字符串
      const numbers = messages.map((msg) => msg.recipientNumber).join(',');
      const orderIds = messages.map((msg) => String(msg.id)).join(',');

      const requestBody = {
        appId: credentials.appId,
        numbers,
        content,
        orderIds,
      };

      this.serviceLogger.debug(
        `Batch sending SMS request: ${JSON.stringify(requestBody)}`,
      );

      // 发送请求
      const response = await axios.post<SmppSendResponse>(url, requestBody, {
        headers,
      });

      const responseData = response.data;
      this.serviceLogger.debug(
        `Batch send SMS response: ${JSON.stringify(responseData)}`,
      );

      // 处理响应
      if (responseData.status === '0' && responseData.array) {
        // 创建号码到结果的映射，以便跟踪每个消息
        const resultMap = new Map<
          string,
          { msgId?: string; msgid?: string; number: string; orderId?: string }
        >();

        responseData.array.forEach((item) => {
          resultMap.set(item.number, item);
        });

        // 处理每个消息
        messages.forEach((message) => {
          const resultItem = resultMap.get(message.recipientNumber);

          if (resultItem && (resultItem.msgId || resultItem.msgid)) {
            // 成功发送
            result.submitted.push({
              id: message.id,
              providerMessageId: resultItem.msgId || resultItem.msgid,
            });
          } else {
            // 未找到结果或无消息ID
            result.failed.push({
              id: message.id,
              errorMessage: '短信发送失败或未返回消息ID',
            });
          }
        });
      } else {
        // 整批失败
        const errorMessage =
          responseData.reason || 'Unknown error in batch send';
        this.serviceLogger.warn(`Batch SMS sending failed: ${errorMessage}`);

        messages.forEach((message) => {
          result.failed.push({
            id: message.id,
            errorMessage,
          });
        });
      }

      // 记录批量发送结果
      this.serviceLogger.log(
        `Batch SMS result: ${result.submitted.length} sent, ${result.failed.length} failed`,
      );

      return result;
    } catch (error) {
      // 处理异常
      let errorMessage: string;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<SmppErrorResponse>;
        const responseData = axiosError.response?.data;

        errorMessage = `SMPP API error during batch send: ${
          responseData?.message ||
          responseData?.reason ||
          axiosError.message ||
          'Unknown error'
        }`;

        this.serviceLogger.error(errorMessage);
        this.serviceLogger.error(
          `Full error details: ${JSON.stringify({
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: responseData,
          })}`,
        );
      } else {
        errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error during SMPP batch send';

        this.serviceLogger.error(`Unexpected error: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          this.serviceLogger.error(`Stack trace: ${error.stack}`);
        }
      }

      // 所有消息都失败
      messages.forEach((message) => {
        result.failed.push({
          id: message.id,
          errorMessage,
        });
      });

      return result;
    }
  }

  /**
   * 查询短信状态
   * @param msgIds 消息ID数组
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @returns 短信状态查询结果
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
    this.serviceLogger.log(
      `Querying message status for ${msgIds.length} messages, tenantId: ${tenantId}, userId: ${userId}`,
    );

    // 初始化计数器和结果数组
    let totalSuccess = 0;
    let totalFail = 0;
    let totalSending = 0;
    let totalNotFound = 0;
    const results: Array<{
      messageId: string;
      recipientNumber: string;
      status: 'delivered' | 'sending' | 'failed' | 'unknown';
      sendTime?: Date;
    }> = [];

    try {
      // 如果没有消息ID，直接返回空结果
      if (!msgIds || msgIds.length === 0) {
        this.serviceLogger.warn('No message IDs provided for status query');
        return {
          results,
          totalSuccess,
          totalFail,
          totalSending,
          totalNotFound,
        };
      }

      // 加载凭证
      const credentials = await this.loadSmppCredentials(tenantId, userId);

      // 确保baseUrl已加载
      if (!this.baseUrl) {
        await this.loadBaseConfig('smpp');
      }

      // 生成请求头
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );

      // 构建请求URL
      const url = `${this.baseUrl}/status/message`;

      // 构建请求参数 - 所有消息ID用逗号连接
      const requestParams = {
        appId: credentials.appId,
        msgIds: msgIds.join(','),
      };

      this.serviceLogger.debug(
        `Querying message status with params: ${JSON.stringify(requestParams)}`,
      );

      // 发送请求
      const response = await axios.get<SmppMessageStatusResponse>(url, {
        headers,
        params: requestParams,
      });

      const responseData = response.data;
      this.serviceLogger.debug(
        `Message status response: ${JSON.stringify(responseData)}`,
      );

      // 处理响应
      if (responseData.status === '0' && responseData.array) {
        // 创建已处理消息ID的集合，用于跟踪未找到的消息
        const processedMsgIds = new Set<string>();

        // 处理每个状态记录
        responseData.array.forEach((statusItem) => {
          // 映射状态
          const status = this.mapMessageStatus(statusItem.status);
          processedMsgIds.add(statusItem.msgId);

          // 更新计数器
          if (status === 'delivered') totalSuccess++;
          else if (status === 'failed') totalFail++;
          else if (status === 'sending') totalSending++;
          else totalNotFound++;

          // 添加结果
          results.push({
            messageId: statusItem.msgId,
            recipientNumber: statusItem.number,
            status,
            sendTime: statusItem.receiveTime
              ? new Date(statusItem.receiveTime)
              : undefined,
          });
        });

        // 处理未找到的消息ID
        msgIds.forEach((msgId) => {
          if (!processedMsgIds.has(msgId)) {
            totalNotFound++;
            results.push({
              messageId: msgId,
              recipientNumber: '',
              status: 'unknown',
            });
          }
        });
      } else {
        // API返回错误
        const errorMessage =
          responseData.reason || 'Unknown error in status query';
        this.serviceLogger.warn(`Message status query failed: ${errorMessage}`);

        // 所有消息标记为未知状态
        msgIds.forEach((msgId) => {
          totalNotFound++;
          results.push({
            messageId: msgId,
            recipientNumber: '',
            status: 'unknown',
          });
        });
      }

      this.serviceLogger.log(
        `Message status query result: success=${totalSuccess}, fail=${totalFail}, sending=${totalSending}, notFound=${totalNotFound}`,
      );

      return { results, totalSuccess, totalFail, totalSending, totalNotFound };
    } catch (error) {
      // 处理异常
      let errorMessage: string;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<SmppErrorResponse>;
        const responseData = axiosError.response?.data;

        errorMessage = `SMPP API error during status query: ${
          responseData?.message ||
          responseData?.reason ||
          axiosError.message ||
          'Unknown error'
        }`;

        this.serviceLogger.error(errorMessage);
        this.serviceLogger.error(
          `Full error details: ${JSON.stringify({
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: responseData,
          })}`,
        );
      } else {
        errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error during message status query';

        this.serviceLogger.error(`Unexpected error: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          this.serviceLogger.error(`Stack trace: ${error.stack}`);
        }
      }

      // 所有消息标记为未知状态
      msgIds.forEach((msgId) => {
        totalNotFound++;
        results.push({
          messageId: msgId,
          recipientNumber: '',
          status: 'unknown',
        });
      });

      return { results, totalSuccess, totalFail, totalSending, totalNotFound };
    }
  }

  /**
   * 映射消息状态
   * @param status API返回的原始状态
   * @returns 标准化的状态
   */
  private mapMessageStatus(
    status: string,
  ): 'delivered' | 'sending' | 'failed' | 'unknown' {
    const lowerStatus = status.toLowerCase();

    if (
      ['delivered', 'success', 'complete', 'completed'].includes(lowerStatus)
    ) {
      return 'delivered';
    } else if (
      ['sending', 'pending', 'processing', 'submitted', 'accepted'].includes(
        lowerStatus,
      )
    ) {
      return 'sending';
    } else if (
      ['failed', 'error', 'rejected', 'expired', 'undeliv'].includes(
        lowerStatus,
      )
    ) {
      return 'failed';
    } else {
      return 'unknown';
    }
  }

  /**
   * 查询发送记录
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @param page 页码，默认1
   * @param limit 每页数量，默认20
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 发送记录查询结果
   */
  async getSentRecords(
    tenantId: number,
    userId: number,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    records: Array<{
      messageId: string;
      recipientNumber: string;
      content: string;
      status: string;
      sendTime: Date;
    }>;
  }> {
    this.serviceLogger.log(
      `Querying sent records, tenantId: ${tenantId}, userId: ${userId}, page: ${page}, limit: ${limit}`,
    );

    try {
      const credentials = await this.loadSmppCredentials(tenantId, userId);
      if (!this.baseUrl) {
        await this.loadBaseConfig('smpp');
      }
      const headers = this.getRequestHeaders(
        credentials.apiKey,
        credentials.apiSecret,
      );
      const url = `${this.baseUrl}/api/v1/getSentRcd`;
      const requestParams: Record<string, string | number> = {
        appId: credentials.appId,
        page,
        limit,
      };
      if (startDate) {
        requestParams.startDate = this.formatDate(startDate);
      }
      if (endDate) {
        requestParams.endDate = this.formatDate(endDate);
      }

      this.serviceLogger.debug(
        `Querying sent records with params: ${JSON.stringify(requestParams)}`,
      );

      // 明确指定axios.get的泛型参数
      const response = await axios.get<SmppGetSentRecordsResponse>(url, {
        headers,
        params: requestParams,
      });

      const responseData = response.data;
      this.serviceLogger.debug(
        `Sent records response: ${JSON.stringify(responseData)}`,
      );

      if (
        responseData.status === '0' ||
        responseData.code === 0 ||
        responseData.code === '0'
      ) {
        const total =
          typeof responseData.total === 'number' ? responseData.total : 0;
        const records = Array.isArray(responseData.records)
          ? responseData.records.map((record: SmppSentRecordItem) => {
              let sendTimeValue: Date;
              if (record.sendTime) {
                //尝试将各种可能的日期格式转换为Date对象
                if (
                  typeof record.sendTime === 'string' ||
                  typeof record.sendTime === 'number'
                ) {
                  sendTimeValue = new Date(record.sendTime);
                } else {
                  sendTimeValue = record.sendTime; //已经是Date对象
                }
              } else {
                sendTimeValue = new Date(); //默认值
              }
              //确保转换后的日期有效，否则使用默认值
              if (isNaN(sendTimeValue.getTime())) {
                this.serviceLogger.warn(
                  `Invalid sendTime format for record: ${JSON.stringify(record)}, using current date as fallback.`,
                );
                sendTimeValue = new Date();
              }

              return {
                messageId: String(record.messageId || record.msgId || ''),
                recipientNumber: String(
                  record.recipientNumber || record.number || '',
                ),
                content: String(record.content || ''),
                status: String(record.status || 'unknown'),
                sendTime: sendTimeValue,
              };
            })
          : [];
        return {
          total,
          records,
        };
      } else {
        const errorMessage =
          responseData.reason ||
          responseData.message ||
          'Unknown error in records query';
        this.serviceLogger.warn(`Sent records query failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      let errorMessage: string;
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<SmppErrorResponse>; // SmppErrorResponse已在文件顶部定义
        const responseData = axiosError.response?.data;
        errorMessage = `SMPP API error during records query: ${
          responseData?.message ||
          responseData?.reason ||
          axiosError.message ||
          'Unknown error'
        }`;
        this.serviceLogger.error(
          errorMessage,
          `Full error details: ${JSON.stringify({
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: responseData,
          })}`,
        );
      } else {
        errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error during sent records query';
        this.serviceLogger.error(
          `Unexpected error: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
      return {
        total: 0,
        records: [],
      };
    }
  }

  /**
   * 格式化日期为 YYYY-MM-DD 格式
   * @param date 日期对象
   * @returns 格式化的日期字符串
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // SMPP渠道实现了所有必要的API方法
}
