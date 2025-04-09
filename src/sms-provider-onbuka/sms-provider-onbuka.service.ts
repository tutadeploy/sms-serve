import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { SmsProvider } from '../sms-provider/entities/sms-provider.entity';
import {
  SmsMessage,
  SmsStatus,
} from '../sms-message/entities/sms-message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 定义 Onbuka API 响应和状态查询结果的接口
interface OnbukaSendResponse {
  status: string;
  reason: string;
  success?: string;
  fail?: string;
  array?: {
    msgid?: string; // v1 API使用
    msgId?: string; // v3 API可能使用
    number: string;
    orderId?: string;
  }[];
}

interface OnbukaReportItem {
  msgid: string;
  number: string;
  receiveTime: string; // ISO 8601 format
  status: string; // "0": success, "1": sending, "-1": failed
}

interface OnbukaReportResponse {
  status: string;
  reason: string;
  success?: string;
  fail?: string;
  sending?: string;
  nofound?: string;
  array?: OnbukaReportItem[];
}

// 为了批量发送扩展SmsMessage类型
// 暂时未使用，可在将来批量API实现中使用
// interface SmsMessageWithContent extends SmsMessage {
//   content: string;
// }

@Injectable()
export class SmsProviderOnbukaService {
  private readonly logger = new Logger(SmsProviderOnbukaService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(SmsProvider)
    private readonly smsProviderRepository: Repository<SmsProvider>,
  ) {}

  /**
   * 获取Onbuka提供商配置
   * 从数据库获取配置
   */
  private async getOnbukaConfig(): Promise<{
    apiKey: string;
    apiSecret: string;
    appid: string;
    baseUrl: string;
  }> {
    // 从数据库查询Onbuka提供商配置
    const provider = await this.smsProviderRepository.findOne({
      where: { name: 'onbuka', isActive: true },
    });

    if (!provider || !provider.configDetails) {
      throw new Error('Onbuka provider configuration not found or incomplete');
    }

    const configDetails = provider.configDetails;
    if (!configDetails || typeof configDetails !== 'object') {
      throw new Error('Onbuka provider config details is not an object');
    }

    // 从configDetails中获取apiKey和apiSecret
    const apiKey = configDetails.apiKey as string;
    const apiSecret = configDetails.apiSecret as string;

    if (!apiKey || !apiSecret) {
      throw new Error(
        'Onbuka authentication credentials (apiKey/apiSecret) missing or invalid',
      );
    }

    // 使用类型断言明确指定类型
    const appidValue = configDetails.appid as unknown;
    if (
      appidValue === undefined ||
      appidValue === null ||
      typeof appidValue !== 'string'
    ) {
      throw new Error(
        'Onbuka configuration incomplete: appid missing or invalid',
      );
    }

    return {
      apiKey,
      apiSecret,
      appid: appidValue,
      baseUrl: provider.baseUrl || 'https://api.onbuka.com',
    };
  }

  /**
   * 发送单条短信
   * @param messageId 短信ID
   * @param recipient 接收者手机号
   * @param content 短信内容
   * @param sender 发送者ID（可选）
   * @returns 发送结果
   */
  async send(
    messageId: number,
    recipient: string,
    content: string,
    sender?: string,
  ): Promise<{
    success: boolean;
    providerMessageId?: string;
    errorMessage?: string;
  }> {
    try {
      // 使用统一的配置获取方法
      const { apiKey, apiSecret, appid, baseUrl } =
        await this.getOnbukaConfig();

      const url = `${baseUrl}v3/sendSms`;
      const headers = this.generateHeaders(apiKey, apiSecret);
      const requestBody = {
        appId: appid,
        numbers: recipient,
        content: content,
        orderId: String(messageId),
        senderId: sender || undefined,
      };

      this.logger.debug(
        `Sending SMS to Onbuka: ${JSON.stringify(requestBody)}`,
      );

      console.log('url', url);
      console.log('headers', headers);
      console.log('requestBody', requestBody);

      const response = await firstValueFrom(
        this.httpService.post<OnbukaSendResponse>(url, requestBody, {
          headers,
        }),
      );

      this.logger.debug(`Onbuka response: ${JSON.stringify(response.data)}`);

      if (
        response.data.status === '0' &&
        response.data.array &&
        response.data.array.length > 0
      ) {
        return {
          success: true,
          providerMessageId:
            response.data.array[0].msgId || response.data.array[0].msgid,
        };
      } else {
        return {
          success: false,
          errorMessage: `Onbuka submission failed. Status: ${response.data.status}, Reason: ${response.data.reason}`,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending SMS via Onbuka: ${errorMessage}`);
      return {
        success: false,
        errorMessage: `Onbuka API error: ${errorMessage}`,
      };
    }
  }

  // --- 核心方法 ---

  /**
   * 使用 Onbuka 发送短信 (适配批量接口)
   * @param messages 要发送的消息列表 (已包含接收者和内容)
   * @param providerConfig 服务商配置实体 (可选，优先使用提供的配置)
   * @returns 返回一个包含 providerMsgid 和初始提交状态的映射
   */
  async sendSmsBatch(
    messages: SmsMessage[],
    providerConfig?: SmsProvider,
  ): Promise<{
    submitted: Partial<SmsMessage>[];
    failed: Partial<SmsMessage>[];
  }> {
    // 获取统一配置
    let apiKey: string;
    let apiSecret: string;
    let appid: string;
    let baseUrl: string;

    if (providerConfig && providerConfig.configDetails) {
      // 如果提供了配置，检查configDetails
      const configDetails = providerConfig.configDetails;
      if (!configDetails || typeof configDetails !== 'object') {
        this.logger.error('Provided Onbuka config details is not an object');
        return {
          submitted: [],
          failed: messages.map((msg) => ({
            id: msg.id,
            status: 'failed' as SmsStatus,
            errorMessage:
              'SMS provider configuration is invalid: config details must be an object',
          })),
        };
      }

      // 从configDetails获取凭证信息
      const configApiKey = configDetails.apiKey as string;
      const configApiSecret = configDetails.apiSecret as string;

      if (!configApiKey || !configApiSecret) {
        this.logger.error('Provided Onbuka credentials are missing or invalid');
        return {
          submitted: [],
          failed: messages.map((msg) => ({
            id: msg.id,
            status: 'failed' as SmsStatus,
            errorMessage:
              'SMS provider configuration is invalid: apiKey and apiSecret are required',
          })),
        };
      }

      // 使用类型断言明确指定类型
      const appidValue = configDetails.appid as unknown;
      if (
        appidValue === undefined ||
        appidValue === null ||
        typeof appidValue !== 'string'
      ) {
        this.logger.error('Provided Onbuka appid is missing or not a string');
        return {
          submitted: [],
          failed: messages.map((msg) => ({
            id: msg.id,
            status: 'failed' as SmsStatus,
            errorMessage:
              'SMS provider configuration is invalid: appid must be a string',
          })),
        };
      }

      // 使用有效的配置
      apiKey = configApiKey;
      apiSecret = configApiSecret;
      appid = appidValue;
      baseUrl = providerConfig.baseUrl || 'https://api.onbuka.com';
    } else {
      // 否则获取默认配置
      try {
        const config = await this.getOnbukaConfig();
        apiKey = config.apiKey;
        apiSecret = config.apiSecret;
        appid = config.appid;
        baseUrl = config.baseUrl;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to get Onbuka configuration: ${errorMsg}`);
        return {
          submitted: [],
          failed: messages.map((msg) => ({
            id: msg.id,
            status: 'failed' as SmsStatus,
            errorMessage: 'SMS provider configuration is incomplete',
          })),
        };
      }
    }

    const url = `${baseUrl}v3/sendSms`;

    // 合并所有手机号码，最多1000个号码
    const recipientNumbers = messages
      .map((msg) => msg.recipientNumber)
      .join(',');

    // 获取批次内容
    // 假设传入的消息数组内容都相同，从批次获取
    const batch = messages[0]?.batch;
    let content: string;

    if (!batch) {
      this.logger.error('Missing batch reference in messages');
      throw new Error('Batch information is required');
    }

    if (batch.contentType === 'direct' && batch.directContent) {
      content = batch.directContent;
    } else {
      this.logger.error('Content not available in messages batch');
      throw new Error('SMS content is required');
    }

    // 合并所有订单ID，与号码一一对应
    const orderIds = messages.map((msg) => String(msg.id)).join(',');

    const requestBody = {
      appId: appid,
      numbers: recipientNumbers,
      content: content,
      orderId: orderIds,
    };

    const headers = this.generateHeaders(apiKey, apiSecret);

    const submittedMessages: Partial<SmsMessage>[] = [];
    const failedMessages: Partial<SmsMessage>[] = [];

    try {
      this.logger.debug(
        `Sending batch request to Onbuka: ${JSON.stringify(requestBody)}`,
      );
      const response = await firstValueFrom(
        this.httpService.post<OnbukaSendResponse>(url, requestBody, {
          headers,
        }),
      );

      this.logger.debug(`Onbuka response: ${JSON.stringify(response.data)}`);

      const responseData = response.data;

      if (responseData?.status === '0' && responseData.array) {
        const resultMap = new Map<string, string>();
        responseData.array.forEach((item) => {
          const msgId = item.msgId || item.msgid;
          if (item.orderId && msgId) {
            resultMap.set(item.orderId, msgId);
          }
        });

        messages.forEach((msg) => {
          const msgid = resultMap.get(String(msg.id));
          if (msgid) {
            submittedMessages.push({
              id: msg.id,
              providerMessageId: msgid,
              status: 'pending',
              errorMessage: null,
            });
          } else {
            failedMessages.push({
              id: msg.id,
              status: 'failed',
              errorMessage: `Onbuka response did not include msgId for orderId ${msg.id}`,
            });
          }
        });
      } else {
        const errorMessage = `Onbuka batch submission failed. Status: ${responseData?.status}, Reason: ${responseData?.reason}`;
        this.logger.error(errorMessage);
        messages.forEach((msg) => {
          failedMessages.push({
            id: msg.id,
            status: 'failed',
            errorMessage: errorMessage,
          });
        });
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error calling Onbuka API: ${errorMsg}`, errorStack);
      messages.forEach((msg) => {
        failedMessages.push({
          id: msg.id,
          status: 'failed',
          errorMessage: errorMsg,
        });
      });
    }

    return { submitted: submittedMessages, failed: failedMessages };
  }

  /**
   * 查询 Onbuka 短信状态
   * @param providerMsgids 要查询的消息 ID 列表
   * @param providerConfig 服务商配置 (可选，优先使用提供的配置)
   * @returns 返回一个包含标准化状态和原始状态的映射
   */
  async getSmsStatus(
    providerMsgids: string[],
    providerConfig?: SmsProvider,
  ): Promise<
    Map<
      string,
      {
        status: SmsStatus;
        providerStatusCode: string;
        providerReportedAt?: Date;
      }
    >
  > {
    try {
      // 如果没有消息ID，返回空Map
      if (!providerMsgids || providerMsgids.length === 0) {
        return new Map();
      }

      // 判断认证信息来源
      let apiKey: string;
      let apiSecret: string;
      let baseUrl: string;

      if (providerConfig && providerConfig.configDetails) {
        // 从提供的配置中获取认证信息
        const configDetails = providerConfig.configDetails;
        if (!configDetails || typeof configDetails !== 'object') {
          throw new Error('Provided config details is not an object');
        }

        // 从configDetails获取认证信息
        apiKey = configDetails.apiKey as string;
        apiSecret = configDetails.apiSecret as string;

        if (!apiKey || !apiSecret) {
          throw new Error('API key or secret missing in provided config');
        }

        baseUrl = providerConfig.baseUrl || 'https://api.onbuka.com';
      } else {
        // 从数据库获取配置
        const config = await this.getOnbukaConfig();
        apiKey = config.apiKey;
        apiSecret = config.apiSecret;
        baseUrl = config.baseUrl;
      }

      const headers = this.generateHeaders(apiKey, apiSecret);
      const trimmedBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;
      const url = `${trimmedBaseUrl}/v3/getReport`;

      const msgids = providerMsgids.join(',');

      const payload = { msgids };
      this.logger.debug(
        `Requesting SMS status from Onbuka: ${JSON.stringify({
          url,
          payload,
        })}`,
      );

      const response = await firstValueFrom(
        this.httpService.post<OnbukaReportResponse>(url, payload, {
          headers,
        }),
      );

      this.logger.debug(
        `Onbuka report response: ${JSON.stringify(response.data)}`,
      );

      const resultMap = new Map<
        string,
        {
          status: SmsStatus;
          providerStatusCode: string;
          providerReportedAt?: Date;
        }
      >();

      if (
        response.data.status === '0' &&
        response.data.array &&
        response.data.array.length > 0
      ) {
        response.data.array.forEach((item) => {
          if (item.msgid) {
            // 将状态代码映射为系统状态
            const status = this.mapOnbukaStatus(item.status);
            const reportTime = new Date(item.receiveTime);

            resultMap.set(item.msgid, {
              status: status,
              providerStatusCode: item.status,
              providerReportedAt: reportTime,
            });
          }
        });
      }

      return resultMap;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error querying Onbuka SMS status: ${errorMsg}`);
      return new Map();
    }
  }

  // --- 辅助方法 ---

  /**
   * 生成Onbuka API认证头
   * @param apiKey API Key
   * @param apiSecret API Secret
   * @returns HTTP请求头对象
   */
  private generateHeaders(
    apiKey: string,
    apiSecret: string,
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // 根据文档生成签名: API Key + API Secret + Timestamp
    const sign = crypto
      .createHash('md5')
      .update(`${apiKey}${apiSecret}${timestamp}`)
      .digest('hex');

    return {
      'Content-Type': 'application/json;charset=UTF-8',
      Sign: sign,
      Timestamp: timestamp,
      'Api-Key': apiKey,
    };
  }

  /**
   * 将 Onbuka 的状态码映射为标准状态
   * @param onbukaStatus Onbuka 返回的状态码 ("0", "1", "-1")
   * @returns SmsStatus
   */
  private mapOnbukaStatus(onbukaStatus: string): SmsStatus {
    switch (onbukaStatus) {
      case '0':
        return 'delivered'; // Buka '0' 明确是成功送达
      case '1':
        return 'sending'; // Buka '1' 是发送中
      case '-1':
        return 'failed'; // Buka '-1' 是失败
      default:
        this.logger.warn(`Unknown Onbuka status code: ${onbukaStatus}`);
        return 'failed'; // 或根据业务逻辑返回 'rejected' or a default failure state
    }
  }

  // --- 其他可能需要的适配器方法 ---
  // 例如: 查询余额、处理上行短信回调等
}
