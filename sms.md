# 短信服务API文档

## 基础信息

- **基础路径**: `/`
- **认证方式**: Bearer Token
- **响应格式**: JSON
- **通用响应结构**:

```json
{
  "code": 0, // 0表示成功，非0表示错误
  "data": {}, // 响应数据
  "message": "" // 响应消息
}
```

## API 端点

### 1. 短信模板管理

#### 1.1 创建短信模板

- **接口**: `POST /template/sms`
- **描述**: 创建新的短信模板
- **请求体**:

```json
{
  "name": "验证码模板",
  "content": "您的验证码是{{code}}，5分钟内有效",
  "variables": ["code"],
  "providerTemplateId": "SMS_12345678" // 可选，服务商模板ID
}
```

- **响应**:

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "name": "验证码模板",
    "content": "您的验证码是{{code}}，5分钟内有效",
    "variables": ["code"],
    "providerTemplateId": "SMS_12345678",
    "createdAt": "2023-08-01T12:30:00Z",
    "updatedAt": "2023-08-01T12:30:00Z"
  },
  "message": "success"
}
```

#### 1.2 获取模板列表（分页）

- **接口**: `GET /template/sms/page`
- **描述**: 分页查询短信模板列表
- **查询参数**:
  - `page`: 页码（从1开始）
  - `size`: 每页数量
  - `name`: 模板名称（可选，模糊查询）
  - `content`: 模板内容（可选，模糊查询）
- **响应**:

```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "验证码模板",
        "content": "您的验证码是{{code}}，5分钟内有效",
        "variables": ["code"],
        "providerTemplateId": "SMS_12345678",
        "createdAt": "2023-08-01T12:30:00Z",
        "updatedAt": "2023-08-01T12:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 10
  },
  "message": "success"
}
```

#### 1.3 获取模板详情

- **接口**: `GET /template/sms/:id`
- **描述**: 获取单个短信模板的详细信息
- **路径参数**:
  - `id`: 模板ID
- **响应**: 同创建模板的响应格式

#### 1.4 更新模板

- **接口**: `PATCH /template/sms/:id`
- **描述**: 更新现有的短信模板
- **路径参数**:
  - `id`: 模板ID
- **请求体**: 同创建模板（所有字段可选）
- **响应**: 同创建模板的响应格式

#### 1.5 删除模板

- **接口**: `DELETE /template/sms/:id`
- **描述**: 删除短信模板
- **路径参数**:
  - `id`: 模板ID
- **响应状态码**: 204 (无响应体)

### 2. 发送短信

#### 2.1 发送短信

- **接口**: `POST /notification/sms`
- **描述**: 使用预定义的模板发送短信
- **请求体**:

```json
{
  "templateId": 1,
  "phoneNumbers": ["13800138000", "13900139000"],
  "params": {
    "code": "123456"
  },
  "scheduledAt": "2023-08-01T15:00:00Z" // 可选，定时发送时间
}
```

- **响应**:

```json
{
  "code": 0,
  "data": {
    "batchId": "SMS_BATCH_20230801123456",
    "success": true,
    "message": "短信发送请求已接受",
    "failedNumbers": [] // 发送失败的手机号列表
  },
  "message": "success"
}
```

### 3. 发送状态查询

#### 3.1 查询批次状态

- **接口**: `GET /status/sms/batch/:batchId`
- **描述**: 查询指定批次的发送状态
- **路径参数**:
  - `batchId`: 批次ID
- **响应**:

```json
{
  "code": 0,
  "data": {
    "batchId": "SMS_BATCH_20230801123456",
    "status": "COMPLETED", // PENDING, PROCESSING, COMPLETED, FAILED
    "total": 2,
    "success": 2,
    "failed": 0,
    "createdAt": "2023-08-01T12:30:00Z",
    "completedAt": "2023-08-01T12:30:05Z"
  },
  "message": "success"
}
```

#### 3.2 查询批次详细记录

- **接口**: `GET /status/sms/batch/:batchId/messages`
- **描述**: 查询批次中每条短信的发送状态
- **路径参数**:
  - `batchId`: 批次ID
- **查询参数**:
  - `page`: 页码
  - `size`: 每页数量
  - `status`: 发送状态（可选）
- **响应**:

```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "MSG_20230801123456_001",
        "phoneNumber": "13800138000",
        "status": "DELIVERED",
        "error": null,
        "sendTime": "2023-08-01T12:30:00Z",
        "deliveryTime": "2023-08-01T12:30:05Z"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 10
  },
  "message": "success"
}
```

#### 3.3 查询单条短信状态

- **接口**: `GET /status/sms/message/:messageId`
- **描述**: 查询单条短信的发送状态
- **路径参数**:
  - `messageId`: 短信ID
- **响应**:

```json
{
  "code": 0,
  "data": {
    "id": "MSG_20230801123456_001",
    "batchId": "SMS_BATCH_20230801123456",
    "phoneNumber": "13800138000",
    "content": "您的验证码是123456，5分钟内有效",
    "status": "DELIVERED",
    "error": null,
    "sendTime": "2023-08-01T12:30:00Z",
    "deliveryTime": "2023-08-01T12:30:05Z"
  },
  "message": "success"
}
```

## 状态码说明

- 200: 成功
- 201: 创建成功
- 204: 删除成功
- 400: 请求参数错误
- 401: 未授权
- 403: 无权限
- 404: 资源不存在
- 429: 请求频率超限
- 500: 服务器内部错误

## 错误码说明

| 错误码 | 说明           | 处理建议                     |
| ------ | -------------- | ---------------------------- |
| 1001   | 模板不存在     | 检查模板ID是否正确           |
| 1002   | 手机号格式错误 | 检查手机号是否符合格式要求   |
| 1003   | 模板参数错误   | 检查参数是否完整且类型正确   |
| 1004   | 发送频率超限   | 稍后重试或联系管理员调整限制 |
| 1005   | 余额不足       | 请充值后重试                 |

## 使用限制

1. 发送频率限制：

   - 单个手机号每分钟最多发送1条
   - 单个手机号每小时最多发送5条
   - 单个手机号每天最多发送10条

2. 模板限制：

   - 模板变量使用 `{{变量名}}` 格式
   - 模板内容长度不超过500字符
   - 变量名只能包含字母、数字和下划线

3. 批量发送限制：

   - 单次请求最多支持100个手机号
   - 定时发送时间不能超过7天

4. 手机号格式：
   - 国内手机号：11位数字
   - 国际手机号：需要包含国际区号，如：+8613800138000

## 最佳实践

1. 错误处理

   ```javascript
   try {
     const response = await sendSms({
       templateId: 1,
       phoneNumbers: ['13800138000'],
       params: { code: '123456' },
     });

     if (response.code === 0) {
       // 发送成功，记录batchId
       const batchId = response.data.batchId;
     } else {
       // 处理业务错误
       console.error(response.message);
     }
   } catch (error) {
     // 处理网络错误
     console.error('请求失败:', error);
   }
   ```

2. 状态轮询

   ```javascript
   async function checkSmsStatus(batchId) {
     const maxAttempts = 10;
     const interval = 3000; // 3秒

     for (let i = 0; i < maxAttempts; i++) {
       const response = await getSmsStatus(batchId);
       if (response.data.status === 'COMPLETED') {
         return response.data;
       }
       await new Promise((resolve) => setTimeout(resolve, interval));
     }
     throw new Error('查询超时');
   }
   ```

3. 模板变量

   ```javascript
   // 推荐
   const params = {
     code: '123456',
     product: 'SMS-Serve',
     expireTime: '5分钟',
   };

   // 不推荐
   const params = {
     code: 123456, // 应该使用字符串
     'product-name': 'SMS-Serve', // 不要使用特殊字符
     expire_time: '5分钟', // 保持命名风格一致
   };
   ```
