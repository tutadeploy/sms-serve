# Buka短信发送结果查询接口分析及实现方案

## 1. 接口文档分析

### 接口1: 查询短信发送结果 (https://www.onbuka.com/zh-cn/sms-api4/)

**请求参数**:

- appId: 应用ID (必填)
- msgIds: 短信消息ID列表，逗号分隔 (必填，最多200个)

**请求方式**: GET

**响应参数**:

- status: 状态码，0表示成功
- reason: 失败原因
- success: 发送成功条数
- fail: 发送失败条数
- sending: 正在发送条数
- nofound: 未找到ID条数
- array: 结果集合，包含:
  - msgId: 平台消息ID
  - number: 手机号
  - receiveTime: 发送时间
  - status: 状态(0成功，-1发送中，1失败)

### 接口2: 查询时间段内发送的短信结果 (https://www.onbuka.com/zh-cn/sms-api5/)

**请求参数**:

- appId: 应用ID (必填)
- startTime: 开始时间，ISO8601格式 (必填)
- endTime: 结束时间，ISO8601格式 (必填)
- startIndex: 起始索引 (可选，默认0)

**请求方式**: GET

**响应参数**:

- status: 状态码，0表示成功
- reason: 失败原因
- success: 发送成功条数
- fail: 发送失败条数
- array: 结果集合，与接口1类似

## 2. 实现方案分析

### 当前系统结构

目前系统已经实现：

- BukaService用于余额查询、发送短信
- 使用配置来源：tenant_channel_configs、user_channel_configs和sms_providers表

### 实现方案

我将在BukaService中添加两个方法:

1. `queryMessageStatusByIds` - 对应接口1，通过msgIds查询
2. `queryMessageStatusByTimeRange` - 对应接口2，按时间范围查询

这两个方法将复用现有的配置逻辑和签名生成方法。

## 3. 代码实现方案

我建议在BukaService中添加如下接口定义和方法：

```typescript
// 定义短信状态查询响应接口
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

// 定义标准化的查询结果
interface MessageStatusResult {
  messageId: string;
  recipientNumber: string;
  status: 'delivered' | 'sending' | 'failed' | 'unknown';
  sendTime?: Date;
  errorCode?: string;
}

/**
 * 通过消息ID列表查询短信状态
 */
async queryMessageStatusByIds(
  msgIds: string[],
  tenantId: number,
  userId: number,
): Promise<MessageStatusResult[]>

/**
 * 按时间范围查询短信状态
 */
async queryMessageStatusByTimeRange(
  startTime: Date,
  endTime: Date,
  startIndex: number = 0,
  tenantId: number,
  userId: number,
): Promise<{
  results: MessageStatusResult[];
  totalSuccess: number;
  totalFail: number;
}>
```

这样设计的好处：

1. 与现有BukaService保持一致的调用风格
2. 提供标准化的返回结果便于上层服务使用
3. 复用现有的credential获取逻辑

## 4. 与当前实现的对比

1. 目前系统中还没有实现这两个查询接口的完整逻辑
2. 通过加入这两个方法，我们可以实现：
   - 批次查询：根据发送时存储的msgId进行状态查询
   - 时间范围查询：根据时间范围进行查询

## 5. 可行性分析

该方案完全可行，主要原因：

1. 我们已经有完整的Buka鉴权逻辑
2. API调用逻辑与现有的余额查询和发送短信类似
3. Buka API返回格式明确，可以轻松转换为标准格式
