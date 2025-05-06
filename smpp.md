# SMPP 独立服务架构设计

## 概述

SMPP 服务作为独立的微服务，仿照 buka 的接口风格设计，提供 SMPP 协议到 HTTP API 的封装。这种架构允许核心 SMS 服务与 SMPP 协议细节解耦，同时保持接口统一性，方便集成。

## 1. 项目结构

```
smpp-serve/
├── src/
│   ├── main.ts                           # 入口文件
│   ├── app.module.ts                     # 主模块
│   ├── config/                           # 配置
│   │   ├── app.config.ts                 # 应用配置
│   │   ├── smpp.config.ts                # SMPP 协议配置
│   │   └── providers.config.ts           # 提供商配置
│   ├── core/                             # 核心模块
│   │   ├── core.module.ts                # 核心模块定义
│   │   ├── decorators/                   # 装饰器
│   │   │   └── smpp-retry.decorator.ts   # 重试装饰器
│   │   ├── interceptors/                 # 拦截器
│   │   └── filters/                      # 异常过滤器
│   ├── logger/                           # 日志模块
│   │   └── logger.service.ts             # 日志服务
│   ├── smpp/                             # SMPP 协议实现
│   │   ├── smpp.module.ts                # SMPP 模块
│   │   ├── smpp-base.service.ts          # SMPP 基础服务
│   │   ├── smpp-connection.manager.ts    # 连接管理器
│   │   ├── smpp-pdu.processor.ts         # PDU 处理器
│   │   └── smpp-session.service.ts       # 会话管理服务
│   ├── providers/                        # SMPP 提供商实现
│   │   ├── providers.module.ts           # 提供商模块
│   │   ├── provider-registry.service.ts  # 提供商注册服务
│   │   ├── provider.interface.ts         # 提供商接口
│   │   ├── twilio/                       # Twilio 提供商
│   │   │   ├── twilio.service.ts         # Twilio 服务
│   │   │   └── twilio.config.ts          # Twilio 配置
│   │   ├── infobip/                      # InfoBip 提供商
│   │   └── generic/                      # 通用 SMPP 提供商
│   ├── api/                              # API 层
│   │   ├── api.module.ts                 # API 模块
│   │   ├── dto/                          # 数据传输对象
│   │   │   ├── send-message.dto.ts       # 发送消息 DTO
│   │   │   ├── query-status.dto.ts       # 查询状态 DTO
│   │   │   └── ...
│   │   ├── controllers/                  # 控制器
│   │   │   ├── message.controller.ts     # 消息控制器
│   │   │   ├── status.controller.ts      # 状态控制器
│   │   │   └── account.controller.ts     # 账户控制器
│   │   └── middleware/                   # 中间件
│   ├── database/                         # 数据库访问
│   │   ├── database.module.ts
│   │   └── entities/
│   ├── monitoring/                       # 监控模块
│   │   ├── monitoring.module.ts
│   │   └── metrics.service.ts
│   └── shared/                           # 共享模块
├── docker/                               # Docker 配置
├── nest-cli.json                         # Nest CLI 配置
├── tsconfig.json                         # TypeScript 配置
├── package.json                          # 依赖管理
└── README.md                             # 文档
```

## 2. 核心 API 设计

### 2.1 消息发送 API

```typescript
// src/api/controllers/message.controller.ts
@Controller('api/v3')
export class MessageController {
  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly metricsService: MetricsService,
  ) {}

  // GET 方式发送短信 - 支持单次不超过 100 个号码
  @Get('sendSms')
  async sendSmsByGet(
    @Query('appId') appId: string,
    @Query('numbers') numbers: string,
    @Query('content') content: string,
    @Query('senderId') senderId?: string,
    @Query('orderId') orderId?: string,
  ): Promise<SmsResponseDto> {
    this.metricsService.incrementCounter('message.send.attempt');
    const startTime = Date.now();

    // 验证电话号码数量限制
    const phoneNumbers = numbers.split(',');
    if (phoneNumbers.length > 100) {
      throw new HttpException(
        {
          status: '1',
          reason: '号码数量超过限制',
          success: '0',
          fail: String(phoneNumbers.length),
          array: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // 获取适合的 SMPP 提供商
      const provider = this.providerRegistry.getProviderByAppId(appId);

      // 发送消息并获取结果
      const result = await provider.batchSendMessage({
        phoneNumbers,
        content: decodeURIComponent(content),
        senderId,
        orderId,
      });

      // 记录成功指标
      this.metricsService.incrementCounter('message.send.success');
      this.metricsService.recordHistogram(
        'message.send.latency',
        Date.now() - startTime,
      );

      // 构建与 buka 一致的响应格式
      return {
        status: '0',
        reason: 'success',
        success: String(result.successCount),
        fail: String(result.failCount),
        array: result.messageResults.map((msg) => ({
          msgId: msg.messageId,
          number: msg.phoneNumber,
          orderId: msg.orderId || '',
        })),
      };
    } catch (error) {
      // 错误处理
      this.metricsService.incrementCounter('message.send.error');
      return {
        status: '1',
        reason: error.message || 'Unknown error',
        success: '0',
        fail: phoneNumbers.length.toString(),
        array: [],
      };
    }
  }

  // POST 方式发送短信 - 支持单次不超过 1000 个号码
  @Post('sendSms')
  async sendSmsByPost(@Body() dto: SendSmsDto): Promise<SmsResponseDto> {
    this.metricsService.incrementCounter('message.send.attempt');
    const startTime = Date.now();

    // 验证电话号码数量限制
    const phoneNumbers = dto.numbers.split(',');
    if (phoneNumbers.length > 1000) {
      throw new HttpException(
        {
          status: '1',
          reason: '号码数量超过限制',
          success: '0',
          fail: String(phoneNumbers.length),
          array: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // 获取适合的 SMPP 提供商
      const provider = this.providerRegistry.getProviderByAppId(dto.appId);

      // 发送消息并获取结果
      const result = await provider.batchSendMessage({
        phoneNumbers,
        content: dto.content,
        senderId: dto.senderId,
        orderId: dto.orderId,
      });

      // 记录成功指标
      this.metricsService.incrementCounter('message.send.success');
      this.metricsService.recordHistogram(
        'message.send.latency',
        Date.now() - startTime,
      );

      // 构建与 buka 一致的响应格式
      return {
        status: '0',
        reason: 'success',
        success: String(result.successCount),
        fail: String(result.failCount),
        array: result.messageResults.map((msg) => ({
          msgId: msg.messageId,
          number: msg.phoneNumber,
          orderId: msg.orderId || '',
        })),
      };
    } catch (error) {
      // 错误处理
      this.metricsService.incrementCounter('message.send.error');
      return {
        status: '1',
        reason: error.message || 'Unknown error',
        success: '0',
        fail: phoneNumbers.length.toString(),
        array: [],
      };
    }
  }
}

// 发送消息 DTO
export class SendSmsDto {
  @IsNotEmpty()
  @IsString()
  appId: string; // 应用ID

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9,]+$/, {
    message: '手机号码格式不正确，应为以逗号分隔的数字字符串',
  })
  numbers: string; // 短信接收号码，多个号码以英文逗号分隔

  @IsNotEmpty()
  @IsString()
  content: string; // 短信内容

  @IsOptional()
  @IsString()
  @MaxLength(20)
  senderId?: string; // 发送者ID，最大长度20字符

  @IsOptional()
  @IsString()
  orderId?: string; // 自定义消息ID
}

// 响应DTO
export class SmsResponseDto {
  status: string; // 状态码，0成功，其他失败
  reason: string; // 失败原因描述
  success: string; // 提交成功的号码数
  fail: string; // 提交失败的号码数
  array: Array<{
    msgId: string; // 消息平台msgid
    number: string; // 接收号码
    orderId?: string; // 自定义消息id
  }>;
}
```

### 2.2 状态查询 API

```typescript
// src/api/controllers/status.controller.ts
@Controller('api/v3')
export class StatusController {
  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  // 查询短信状态接口
  @Get('getReport')
  async getMessageStatus(
    @Query('appId') appId: string,
    @Query('msgId') msgId: string,
  ): Promise<StatusResponseDto> {
    try {
      // 根据 appId 获取提供商
      const provider = this.providerRegistry.getProviderByAppId(appId);

      // 查询消息状态
      const status = await provider.queryMessageStatus(msgId);

      return {
        status: '0',
        reason: 'success',
        success: '1',
        fail: '0',
        sending: '0',
        notsend: '0',
        array: [
          {
            msgId: msgId,
            number: status.phoneNumber,
            receiveTime: status.deliveredAt || '',
            status: status.deliveryStatus === 'DELIVRD' ? '0' : '1',
            pricedetail: {
              pay: status.cost?.toString() || '0.00',
              currency: status.currency || 'USD',
              chargeUnit: '1',
              price: status.price?.toString() || '0.01',
              settleCurrency: status.settleCurrency || 'USD',
              settlePrice: status.settlePrice?.toString() || '',
              quoteExchange: status.quoteExchange || '',
              settlePay: status.settlePay?.toString() || '',
            },
          },
        ],
      };
    } catch (error) {
      return {
        status: '1',
        reason: error.message || 'Query failed',
        success: '0',
        fail: '1',
        sending: '0',
        notsend: '0',
        array: [
          {
            msgId: msgId,
            number: '',
            receiveTime: '',
            status: '1',
            pricedetail: null,
          },
        ],
      };
    }
  }
}

// 状态响应DTO
export class StatusResponseDto {
  status: string; // 状态码，0成功，其他失败
  reason: string; // 状态描述
  success: string; // 提交成功的条数
  fail: string; // 提交失败的条数
  sending: string; // 正在处理的条数
  notsend: string; // 未投递的条数(如较长时间未收到回执)
  array: StatusDetailItem[];
}

export class StatusDetailItem {
  msgId: string; // 消息平台msgid
  number: string; // 接收号码
  receiveTime: string; // 接收时间，ISO8601格式如(2021-02-12T09:30:01+08:00)
  status: string; // 短信状态，0表示成功，1表示失败，其他见详细状态码对照表
  pricedetail: PriceDetail; // 计费详情
}

export class PriceDetail {
  pay: string; // 总费用
  currency: string; // 币种
  chargeUnit: string; // 计费单位
  price: string; // 单价
  settleCurrency: string; // 结算币种，当与币种不同时显示
  settlePrice: string; // 结算单价，当与币种不同时显示
  quoteExchange: string; // 报价汇率，当与币种不同时显示
  settlePay: string; // 结算总费用，当与币种不同时显示
}
```

### 2.3 时间段查询 API

```typescript
// src/api/controllers/record.controller.ts
@Controller('api/v3')
export class RecordController {
  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  // 查询时间段内发送的短信结果
  @Get('getSentRcd')
  async getSentRecords(
    @Query('appId') appId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('startIndex') startIndex: string = '0',
  ): Promise<SentRecordResponseDto> {
    try {
      // 解析查询参数
      const startIdx = parseInt(startIndex, 10) || 0;

      // 获取提供商
      const provider = this.providerRegistry.getProviderByAppId(appId);

      // 查询在指定时间段内发送的短信记录
      const records = await provider.queryMessagesByTimeRange({
        startTime,
        endTime,
        startIndex: startIdx,
        limit: 50, // 每页最多返回50条记录
      });

      // 构建响应
      return {
        status: '0',
        reason: 'success',
        success: records.successCount.toString(),
        fail: records.failCount.toString(),
        array: records.messages.map((msg) => ({
          msgId: msg.messageId,
          number: msg.phoneNumber,
          receiveTime: msg.receiveTime || '',
          status: msg.status === 'DELIVRD' ? '0' : '1',
        })),
      };
    } catch (error) {
      return {
        status: '1',
        reason: error.message || 'Query failed',
        success: '0',
        fail: '0',
        array: [],
      };
    }
  }
}

// 时间段查询参数接口
export interface TimeRangeQueryParams {
  startTime: string; // 查询开始时间，ISO8601格式
  endTime: string; // 查询结束时间，ISO8601格式
  startIndex: number; // 起始索引
  limit: number; // 每次返回数量限制
}

// 时间段查询结果接口
export interface MessagesByTimeRangeResult {
  successCount: number;
  failCount: number;
  messages: Array<{
    messageId: string;
    phoneNumber: string;
    receiveTime?: string;
    status: string;
  }>;
}

// 发送记录响应DTO
export class SentRecordResponseDto {
  status: string; // 状态码，0成功，其他失败
  reason: string; // 失败原因描述
  success: string; // 发送成功的条数
  fail: string; // 发送失败的条数
  array: Array<{
    msgId: string; // 提交平台生成的msgId
    number: string; // 接收号码
    receiveTime: string; // 发送时间，ISO8601格式(2021-02-12T09:30:03+08:00)
    status: string; // 发送状态：0表示成功，-1: 发送中，1: 发送失败
  }>;
}
```

### 2.4 余额查询 API

```typescript
// src/api/controllers/account.controller.ts
@Controller('api/v3')
export class AccountController {
  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  @Get('getBalance')
  async getBalance(@Query('appId') appId: string): Promise<BalanceResponseDto> {
    try {
      const provider = this.providerRegistry.getProviderByAppId(appId);
      const balance = await provider.getBalance();

      return {
        status: '0',
        reason: 'success',
        balance: balance.amount.toString(),
        currency: balance.currency || 'USD',
        updatedAt: balance.updatedAt,
      };
    } catch (error) {
      return {
        status: '1',
        reason: error.message || 'Balance query failed',
        balance: '0',
        currency: 'USD',
        updatedAt: new Date().toISOString(),
      };
    }
  }
}

// 余额响应DTO
export class BalanceResponseDto {
  status: string; // 状态码，0成功，其他失败
  reason: string; // 状态描述
  balance: string; // 账户余额
  currency: string; // 货币类型
  updatedAt: string; // 更新时间
}
```

## 3. 提供商接口设计

```typescript
// src/providers/provider.interface.ts
export interface SmppProvider {
  // 初始化提供商
  initialize(): Promise<void>;

  // 批量发送消息
  batchSendMessage(
    params: BatchSendMessageParams,
  ): Promise<BatchSendMessageResult>;

  // 查询消息状态
  queryMessageStatus(messageId: string): Promise<MessageStatus>;

  // 获取账户余额
  getBalance(): Promise<BalanceInfo>;

  // 根据时间段查询短信记录
  queryMessagesByTimeRange(
    params: TimeRangeQueryParams,
  ): Promise<MessagesByTimeRangeResult>;

  // 提供商健康检查
  healthCheck(): Promise<HealthCheckResult>;
}

// 批量发送短信参数接口
export interface BatchSendMessageParams {
  phoneNumbers: string[];
  content: string;
  senderId?: string;
  orderId?: string;
}

// 批量发送短信结果接口
export interface BatchSendMessageResult {
  successCount: number;
  failCount: number;
  messageResults: Array<{
    messageId: string;
    phoneNumber: string;
    orderId?: string;
    status: 'success' | 'failed';
    errorCode?: string;
    errorMessage?: string;
  }>;
}

// 余额信息接口
export interface BalanceInfo {
  amount: number; // 余额金额
  currency: string; // 货币
  updatedAt: string; // 更新时间
}
```

## 4. 监控和健康检查

### 4.1 监控指标服务

```typescript
// src/monitoring/metrics.service.ts
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  // 增加计数器
  incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  // 记录直方图数据
  recordHistogram(name: string, value: number): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }

    this.histograms.get(name).push(value);
  }

  // 获取所有指标
  getMetrics(): Record<string, any> {
    const metrics = {
      counters: {},
      histograms: {},
    };

    // 处理计数器
    for (const [name, value] of this.counters.entries()) {
      metrics.counters[name] = value;
    }

    // 处理直方图
    for (const [name, values] of this.histograms.entries()) {
      metrics.histograms[name] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
      };
    }

    return metrics;
  }
}
```

### 4.2 健康检查接口

```typescript
// src/api/controllers/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  async healthCheck(): Promise<HealthCheckResponseDto> {
    const providersHealth = {};
    const providers = this.providerRegistry.getAllProviders();

    for (const [key, provider] of providers.entries()) {
      try {
        const health = await provider.healthCheck();
        providersHealth[key] = {
          status: health.status,
          latency: health.latency,
          lastCheckedAt: health.timestamp,
        };
      } catch (error) {
        providersHealth[key] = {
          status: 'error',
          error: error.message,
        };
      }
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      providers: providersHealth,
      metrics: this.metricsService.getMetrics(),
    };
  }
}

// 健康检查响应
export interface HealthCheckResponseDto {
  status: string; // 服务状态
  timestamp: string; // 当前时间戳
  version: string; // 服务版本
  providers: Record<string, ProviderHealth>; // 各提供商健康状态
  metrics: Record<string, any>; // 监控指标
}

export interface ProviderHealth {
  status: string; // 健康状态
  latency?: number; // 延迟(ms)
  lastCheckedAt?: string; // 最后检查时间
  error?: string; // 错误信息，如果有
}

// 提供商健康检查结果
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number; // ms
  timestamp: string;
  details?: Record<string, any>;
}
```

## 5. 认证与签名

### 5.1 签名鉴权方法

签名生成方法：使用 API key + API secret + Timestamp 当前系统时间(秒)，生成 MD5-32位字符串(不区分大小写)

示例：
| 参数 | 值 | 方法 |
|------|------|------|
| API key | bDqJFiql9 | |
| API secret | 7hz1pib9 | MD5(bDqJFiql97hz1pib91634668800) |
| Timestamp(当前系统时间(秒)) | 1634668800 | |

### 5.2 请求头参数

| header参数   | 说明                           |
| ------------ | ------------------------------ |
| Content-Type | application/json;charset=UTF-8 |
| Sign         | 加密后签名                     |
| Timestamp    | 当前系统时间(秒)               |
| Api-Key      | API key (由开外发者设置)       |

## 6. 错误状态码

| 状态码 | 参数说明                                   |
| ------ | ------------------------------------------ |
| 0      | 成功                                       |
| -1     | 认证错误                                   |
| -2     | IP访问受限                                 |
| -3     | 短信内容含有敏感字符                       |
| -4     | 短信内容为空                               |
| -5     | 短信内容过长                               |
| -6     | 本条模板的批次                             |
| -7     | 号码个数过多                               |
| -8     | 号码为空                                   |
| -9     | 号码异常                                   |
| -10    | 客户余额不足，不能满足本次发送             |
| -11    | 定时时间格式不对                           |
| -12    | 由于平台问题，暂无法提交，请联系管理员解决 |
| -13    | 用户禁短                                   |
| -14    | Field为空或者field异常                     |
| -15    | 签名过期                                   |
| -16    | timestamp expires                          |
| -17    | 短信模板不能为空                           |
| -18    | 指令异常                                   |
| -19    | 联系商务开通相应短信报价                   |
| -20    | 数据已存在                                 |
| -21    | 数据格式异常                               |
| -22    | 参数异常                                   |
| -23    | 数据上限                                   |
| -24    | 数据不存在                                 |
| -25    | 超出时间范围                               |
| -26    | 获取费用失败                               |
| -27    | 周期内发送次数超限制                       |
| -28    | 周期内向同号码发送短信超限制               |

## 7. 总结

本文档设计了 SMPP 独立服务的核心接口，包括：

1. **短信发送接口** - `GET/POST /api/v3/sendSms`

   - 支持单次发送到多个手机号
   - GET方式支持最多100个号码，POST方式支持最多1000个号码

2. **状态查询接口** - `GET /api/v3/getReport`

   - 查询指定msgId的短信发送状态
   - 包含发送状态、费用详情等信息

3. **时间段查询接口** - `GET /api/v3/getSentRcd`

   - 根据时间范围查询短信发送结果
   - 支持分页，每页最多返回50条记录

4. **余额查询接口** - `GET /api/v3/getBalance`

   - 查询账户余额与币种信息

5. **监控与健康检查**

   - `GET /health` 提供服务健康状态和性能指标
   - 内置指标收集，支持请求计数、延迟监控等

6. **认证与错误处理**
   - 使用MD5签名方式进行API访问鉴权
   - 统一的错误状态码和返回格式

这种设计使 SMPP 服务的接口与 buka 完全兼容，便于主系统统一调用和管理不同的短信服务提供商，实现无缝整合。
