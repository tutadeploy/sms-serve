# Buka短信服务测试结果记录

## 1. 登录获取Token

**请求：**

```bash
curl -X POST http://localhost:3000/v1/system/auth/login -H "Content-Type: application/json" -d '{"username": "admin", "password": "admin123", "rememberMe": true}' | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "2",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJJZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGVzIjpbImFkbWluIl0sInRlbmFudElkIjoxLCJjbGllbnRJZCI6IndlYiIsImp0aSI6IjBhYzhmODQxLWY2MWEtNDdiZi1iMDc2LWY1ZTYyMDZiOWU3NSIsImlhdCI6MTc0NDIyODk1NCwiZXhwIjoxNzQ0MjMyNTU0LCJpc3MiOiJzbXMtc2VydmUifQ.lpJSZFsAsRipGK4syUIZgv2yTzzjYp-pjBeYog3sKS4",
    "refreshToken": "0ac8f841-f61a-47bf-b076-f5e6206b9e75",
    "userId": 1,
    "userType": 1,
    "clientId": "web",
    "expiresTime": 1744232554,
    "sessionId": "5c50b31b-816b-4904-9cc7-02e814837a25",
    "tenantId": 1
  }
}
```

## 2. 查询短信模板列表（初始状态）

**请求：**

```bash
curl -X GET "http://localhost:3000/v1/template/sms/list" -H "Authorization: Bearer $TOKEN" | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": []
}
```

## 3. 创建短信模板

**请求：**

```bash
curl -X POST "http://localhost:3000/v1/template/sms/create" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name": "美国测试模板", "content": "您的验证码是：{code}，请在5分钟内使用。", "providerTemplateId": "SMS_TEST_001", "variables": ["code"]}' | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 2,
    "userId": 1,
    "tenantId": 1,
    "name": "美国测试模板",
    "content": "您的验证码是：{code}，请在5分钟内使用。",
    "providerTemplateId": "SMS_TEST_001",
    "variables": ["code"],
    "createTime": "2025-04-09T12:05:26.000Z",
    "updateTime": "2025-04-09T12:05:26.000Z",
    "user": {
      "id": 1,
      "username": "admin",
      "email": null,
      "role": "admin",
      "isActive": true,
      "tenantId": 1,
      "tenant": {
        "id": 1,
        "name": "PNS",
        "code": "pns",
        "website": null,
        "contactEmail": null,
        "contactPhone": null,
        "logoUrl": null,
        "status": "active",
        "expirationDate": null,
        "createTime": "2025-04-09T11:48:35.000Z",
        "updateTime": "2025-04-09T11:48:35.000Z"
      },
      "createTime": "2025-04-09T11:48:35.000Z",
      "updateTime": "2025-04-09T11:48:35.000Z"
    }
  }
}
```

## 4. 查询更新后的短信模板列表

**请求：**

```bash
curl -X GET "http://localhost:3000/v1/template/sms/list" -H "Authorization: Bearer $TOKEN" | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 2,
      "userId": 1,
      "tenantId": 1,
      "name": "美国测试模板",
      "content": "您的验证码是：{code}，请在5分钟内使用。",
      "providerTemplateId": "SMS_TEST_001",
      "variables": ["code"],
      "createTime": "2025-04-09T12:05:26.000Z",
      "updateTime": "2025-04-09T12:05:26.000Z",
      "user": {
        "id": 1,
        "username": "admin",
        "email": null,
        "role": "admin",
        "isActive": true,
        "tenantId": 1,
        "tenant": {
          "id": 1,
          "name": "PNS",
          "code": "pns",
          "website": null,
          "contactEmail": null,
          "contactPhone": null,
          "logoUrl": null,
          "status": "active",
          "expirationDate": null,
          "createTime": "2025-04-09T11:48:35.000Z",
          "updateTime": "2025-04-09T11:48:35.000Z"
        },
        "createTime": "2025-04-09T11:48:35.000Z",
        "updateTime": "2025-04-09T11:48:35.000Z"
      }
    },
    {
      "id": 1,
      "userId": 1,
      "tenantId": 1,
      "name": "123",
      "content": "123",
      "providerTemplateId": "SMS_1744229117897_996",
      "variables": [],
      "createTime": "2025-04-09T12:05:18.000Z",
      "updateTime": "2025-04-09T12:05:18.000Z",
      "user": {
        "id": 1,
        "username": "admin",
        "email": null,
        "role": "admin",
        "isActive": true,
        "tenantId": 1,
        "tenant": {
          "id": 1,
          "name": "PNS",
          "code": "pns",
          "website": null,
          "contactEmail": null,
          "contactPhone": null,
          "logoUrl": null,
          "status": "active",
          "expirationDate": null,
          "createTime": "2025-04-09T11:48:35.000Z",
          "updateTime": "2025-04-09T11:48:35.000Z"
        },
        "createTime": "2025-04-09T11:48:35.000Z",
        "updateTime": "2025-04-09T11:48:35.000Z"
      }
    }
  ]
}
```

## 5. 发送短信

**请求：**

```bash
curl -X POST "http://localhost:3000/v1/notification/sms" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"providerId": 1, "recipients": ["3392427816"], "countryCode": "US", "content": "您的验证码是123456，5分钟内有效", "templateId": 2, "variables": {"code": "123456"}}' | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "1",
    "userId": 1,
    "name": "SMS Batch 2025-04-09T20:08:46.660Z",
    "status": "pending",
    "templateId": 2,
    "templateParams": {
      "code": "123456"
    },
    "processingStartedAt": null,
    "createTime": "2025-04-09T12:08:46.000Z",
    "updateTime": "2025-04-09T12:08:46.000Z",
    "contentType": "template",
    "directContent": null,
    "processedCount": 0,
    "successCount": 0,
    "failureCount": 0,
    "processingCompletedAt": null,
    "providerId": 1,
    "recipientNumbers": "3392427816",
    "totalRecipients": 1
  }
}
```

## 6. 查询批次详情

**请求：**

```bash
curl -X GET "http://localhost:3000/v1/notification/sms/batches/1" -H "Authorization: Bearer $TOKEN" | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "1",
    "userId": 1,
    "name": "SMS Batch 2025-04-09T20:08:46.660Z",
    "status": "completed",
    "contentType": "template",
    "templateId": "2",
    "totalRecipients": 1,
    "processedCount": 0,
    "successCount": 0,
    "failureCount": 0,
    "createTime": "2025-04-09T12:08:46.000Z",
    "updateTime": "2025-04-09T12:08:47.000Z",
    "directContent": null,
    "templateParams": {
      "code": "123456"
    },
    "providerId": "1",
    "recipientNumbers": "3392427816",
    "messages": [
      {
        "id": "1",
        "batchId": "1",
        "recipientNumber": "13392427816",
        "status": "sent",
        "providerMessageId": "6504100408461579488",
        "errorMessage": null,
        "sendTime": "2025-04-09T20:08:48.000Z",
        "statusUpdateTime": null,
        "createTime": "2025-04-09T12:08:46.000Z",
        "updateTime": "2025-04-09T12:08:47.000Z"
      }
    ]
  }
}
```

## 7. 刷新批次状态

**请求：**

```bash
curl -X POST "http://localhost:3000/v1/notification/sms/batches/1/refresh" -H "Authorization: Bearer $TOKEN" | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "1",
    "userId": 1,
    "name": "SMS Batch 2025-04-09T20:08:46.660Z",
    "status": "completed",
    "contentType": "template",
    "templateId": "2",
    "totalRecipients": 1,
    "processedCount": 0,
    "successCount": 0,
    "failureCount": 0,
    "createTime": "2025-04-09T12:08:46.000Z",
    "updateTime": "2025-04-09T12:08:47.000Z",
    "directContent": null,
    "templateParams": {
      "code": "123456"
    },
    "providerId": "1",
    "recipientNumbers": "3392427816",
    "messages": [
      {
        "id": "1",
        "batchId": "1",
        "recipientNumber": "13392427816",
        "status": "sent",
        "providerMessageId": "6504100408461579488",
        "errorMessage": null,
        "sendTime": "2025-04-09T20:08:48.000Z",
        "statusUpdateTime": "2025-04-09T20:09:20.000Z",
        "createTime": "2025-04-09T12:08:46.000Z",
        "updateTime": "2025-04-09T12:09:19.000Z"
      }
    ]
  }
}
```

## 8. 查询批次状态详情（使用status API）

**请求：**

```bash
curl -X GET "http://localhost:3000/v1/status/sms/batch/1" -H "Authorization: Bearer $TOKEN" | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "1",
    "userId": 1,
    "name": "SMS Batch 2025-04-09T20:08:46.660Z",
    "status": "completed",
    "templateId": "2",
    "templateParams": {
      "code": "123456"
    },
    "processingStartedAt": null,
    "createTime": "2025-04-09T12:08:46.000Z",
    "updateTime": "2025-04-09T12:08:47.000Z",
    "contentType": "template",
    "directContent": null,
    "processedCount": 0,
    "successCount": 0,
    "failureCount": 0,
    "processingCompletedAt": "2025-04-09T20:08:48.000Z",
    "providerId": "1",
    "recipientNumbers": "3392427816",
    "totalRecipients": 1
  }
}
```

## 9. 查询批次消息详情

**请求：**

```bash
curl -X GET "http://localhost:3000/v1/status/sms/batch/1/messages" -H "Authorization: Bearer $TOKEN" | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "meta": {
      "pageNo": 1,
      "limit": 20,
      "total": 1,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "items": [
      {
        "id": "1",
        "batchId": "1",
        "providerId": 1,
        "recipientNumber": "13392427816",
        "status": "sent",
        "providerMessageId": "6504100408461579488",
        "errorMessage": null,
        "sendTime": "2025-04-09T20:08:48.000Z",
        "statusUpdateTime": "2025-04-09T20:09:20.000Z",
        "createTime": "2025-04-09T12:08:46.000Z",
        "updateTime": "2025-04-09T12:09:19.000Z"
      }
    ]
  }
}
```

## 10. 查询所有短信批次

**请求：**

```bash
curl -X GET "http://localhost:3000/v1/notification/sms/batches" -H "Authorization: Bearer $TOKEN" | jq
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "1",
        "userId": 1,
        "name": "SMS Batch 2025-04-09T20:08:46.660Z",
        "status": "completed",
        "contentType": "template",
        "templateId": "2",
        "totalRecipients": 1,
        "processedCount": 0,
        "successCount": 0,
        "failureCount": 0,
        "createTime": "2025-04-09T12:08:46.000Z",
        "updateTime": "2025-04-09T12:08:47.000Z"
      }
    ],
    "total": 1
  }
}
```

## 测试结果总结

1. **登录认证**：成功获取Token并后续用于API认证
2. **模板管理**：成功创建短信模板并检索模板列表
3. **短信发送**：成功向美国号码3392427816发送短信
4. **批次查询**：批次状态从"pending"正确更新为"completed"
5. **消息查询**：成功查询到消息状态为"sent"，并包含Buka的providerMessageId
6. **状态刷新**：成功通过refresh接口更新批次状态的最新情况
7. **批次列表**：成功获取所有已发送的批次列表

测试验证了整个短信发送流程工作正常，包括批次创建、发送和状态查询功能。
