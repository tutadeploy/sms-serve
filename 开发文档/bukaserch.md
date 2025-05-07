# Buka短信发送结果查询与批次处理方案

## 1. 发送短信API文档分析

根据[Buka官方API文档](https://www.onbuka.com/zh-cn/sms-api3/)，发送短信的API接口具有以下特点：

### 请求参数

- appId: 应用ID (必填)
- numbers: 短信接收号码，多个号码以逗号分隔 (GET最多100个, POST最多1000个)
- content: 发送内容 (必填)
- senderId: 发送号码 (可选)
- orderId: 自定义消息ID，数量需与手机号码数量一致 (可选)

### 响应参数

- status: 状态码，0表示成功
- reason: 失败原因
- success: 提交成功号码数量
- fail: 提交失败号码数量
- array: 提交成功的JSON集合，包含：
  - msgId: 平台消息ID
  - number: 提交号码
  - orderId: 自定义消息ID

### 重要回调机制

Buka API在短信提交成功后会返回msgId，这个msgId是后续查询短信状态的关键参数。

## 2. 批次处理系统设计

### 2.1 批次基础信息表设计

批次基础信息表包含所有渠道共用的字段：

```sql
CREATE TABLE sms_batch (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  user_id INT NOT NULL,
  channel VARCHAR(50) NOT NULL, -- 'onbuka', 'twilio' 等
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL, -- 'pending', 'submitted', 'completed', 'failed'
  reason TEXT,
  total_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  content TEXT NOT NULL
);
```

### 2.2 Buka特定批次详情表设计

为Buka渠道专门设计的批次详情表：

```sql
CREATE TABLE sms_batch_buka_detail (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL, -- 关联到sms_batch表的id
  message_id INT NOT NULL, -- 系统内部消息ID
  order_id VARCHAR(50) NOT NULL, -- 提交给Buka的订单ID
  provider_message_id VARCHAR(50), -- Buka返回的msgId
  recipient_number VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'delivered', 'failed', 'sending'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES sms_batch(id)
);
```

## 3. 工作流程设计

### 3.1 创建批次流程

1. 用户提交一批手机号码和短信内容
2. 系统创建一条`sms_batch`记录
3. 系统为每个手机号创建`sms_batch_buka_detail`记录
4. 调用BukaService.sendSmsBatch方法发送短信
5. 根据发送结果更新批次状态和详情

### 3.2 批次状态查询流程

1. 前端查询批次基本信息：`sms_batch`表提供批次总体状态
2. 前端查询批次详情时：
   - 先从`sms_batch_buka_detail`获取所有msgId
   - 调用BukaService.queryMessageStatusByIds实时查询最新状态
   - 将查询结果返回前端但不存储

## 4. 方案整合与实现建议

### 4.1 BukaService扩展

基于现有的`BukaService`和`buka.md`中提出的方案，需要补充以下功能：

```typescript
// 在BukaService中添加

// 已有的BukaSendResponse接口
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

// 新增的批次查询响应接口
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

/**
 * 通过消息ID列表查询短信状态
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
}>
```

### 4.2 BatchService新增

创建新的服务处理批次逻辑：

```typescript
@Injectable()
export class SmsBatchService {
  constructor(
    @InjectRepository(SmsBatch)
    private batchRepository: Repository<SmsBatch>,
    @InjectRepository(SmsBatchBukaDetail)
    private bukaDetailRepository: Repository<SmsBatchBukaDetail>,
    private bukaService: BukaService,
  ) {}

  // 创建新批次
  async createBatch(data: CreateBatchDto): Promise<SmsBatch> {
    // 实现批次创建逻辑
  }

  // 获取批次详情
  async getBatchDetails(batchId: number): Promise<SmsBatch> {
    // 获取批次基本信息
  }

  // 查询批次中短信的实时状态
  async getBatchMessageStatus(batchId: number): Promise<BatchStatusResult> {
    // 1. 获取批次对应的渠道
    const batch = await this.batchRepository.findOne(batchId);

    // 2. 如果是Buka渠道
    if (batch.channel === 'onbuka') {
      // 获取所有msgIds
      const details = await this.bukaDetailRepository.find({
        where: { batchId },
      });

      const msgIds = details
        .filter((d) => d.providerMessageId)
        .map((d) => d.providerMessageId);

      // 调用Buka查询API
      return this.bukaService.queryMessageStatusByIds(
        msgIds,
        batch.tenantId,
        batch.userId,
      );
    }

    // 3. 其他渠道处理...
  }
}
```

## 5. 与现有代码的整合分析

目前的`buka.service.ts`已经实现了：

1. 凭证管理：从多个表获取配置信息
2. 请求签名生成：generateSign方法
3. 短信发送：send和sendSmsBatch方法

需要补充的功能：

1. 添加queryMessageStatusByIds方法用于批次详情查询
2. 添加queryMessageStatusByTimeRange方法用于历史记录查询
3. 创建批次管理服务和相关实体

## 6. 可行性与优势

1. **可行性高**：利用现有的认证和配置管理逻辑，只需添加新的API调用方法
2. **一致性好**：保持与现有服务相同的调用风格和错误处理
3. **扩展性强**：批次表设计考虑了多渠道支持，可轻松添加新渠道
4. **性能优化**：批次基本信息存储在数据库，详细状态实时查询不占用存储空间

## 7. 实施步骤建议

1. 创建数据库表：`sms_batch`和`sms_batch_buka_detail`
2. 在BukaService中实现查询方法
3. 创建BatchService处理批次逻辑
4. 添加API端点供前端调用
5. 实现前端批次管理和详情查询页面
