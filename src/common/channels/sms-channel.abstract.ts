import { Injectable } from '@nestjs/common';

/**
 * 短信发送结果接口
 */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  orderId?: string;
  errorCode?: number | string;
  errorMessage?: string;
}

/**
 * 批次查询结果接口
 */
export interface BatchQueryResult {
  batchId: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  pendingCount: number;
  status: 'processing' | 'completed' | 'failed' | 'partially_completed';
  details?: MessageStatusDetail[];
}

/**
 * 消息状态详情接口
 */
export interface MessageStatusDetail {
  messageId: string;
  recipientNumber: string;
  status:
    | 'submitted'
    | 'sent'
    | 'delivered'
    | 'failed'
    | 'rejected'
    | 'unknown';
  sendTime?: Date;
  deliveredAt?: Date;
  errorCode?: number | string;
  errorMessage?: string;
}

/**
 * 支持的国家信息接口
 */
export interface CountryInfo {
  code: string;
  dialCode: string;
}

/**
 * 抽象短信渠道基类
 * 定义所有短信渠道服务商需要实现的通用方法
 */
@Injectable()
export abstract class SmsChannel {
  /**
   * 获取渠道标识
   */
  abstract getChannelCode(): string;

  /**
   * 获取渠道名称
   */
  abstract getChannelName(): string;

  /**
   * 发送短信
   * @param recipientNumber 接收人手机号(已包含国家区号)
   * @param content 短信内容
   * @param orderId 自定义消息ID(可选)
   * @returns 发送结果
   */
  abstract sendSms(
    recipientNumber: string,
    content: string,
    orderId?: string,
  ): Promise<SmsSendResult>;

  /**
   * 批量发送相同内容的短信
   * @param recipientNumbers 接收人手机号列表(已包含国家区号)
   * @param content 短信内容
   * @param orderIds 自定义消息ID列表(可选，长度应与recipientNumbers相同)
   * @returns 发送结果数组
   */
  abstract sendBatchSms(
    recipientNumbers: string[],
    content: string,
    orderIds?: string[],
  ): Promise<SmsSendResult[]>;

  /**
   * 查询消息状态
   * @param messageIds 消息ID列表
   * @returns 消息状态详情数组
   */
  abstract queryMessageStatus(
    messageIds: string[],
  ): Promise<MessageStatusDetail[]>;

  /**
   * 根据时间范围查询批次结果
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param batchIds 批次ID数组(可选)
   * @returns 批次查询结果
   */
  abstract queryBatchByTimeRange(
    startTime: Date,
    endTime: Date,
    batchIds?: string[],
  ): Promise<BatchQueryResult[]>;

  /**
   * 获取该渠道支持的国家列表
   * @returns 支持的国家信息数组
   */
  abstract getSupportedCountries(): Promise<CountryInfo[]>;

  /**
   * 验证渠道配置是否有效
   * @returns 配置是否有效
   */
  abstract validateConfig(): Promise<boolean>;
}
