# SMS消息查询接口测试结果

## 接口信息

- 请求方法: GET
- 接口路径: `/v1/status/sms/messages`
- 权限要求: 需要JWT令牌认证

## 请求参数

| 参数名          | 类型   | 是否必须 | 说明                       |
| --------------- | ------ | -------- | -------------------------- |
| pageNo          | number | 是       | 页码，从1开始              |
| limit           | number | 是       | 每页记录数                 |
| status          | string | 否       | 消息状态                   |
| recipientNumber | string | 否       | 接收者号码（支持模糊查询） |
| batchId         | number | 否       | 批次ID                     |
| tenantId        | number | 否       | 租户ID（仅管理员可用）     |

## 响应结果

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "meta": {
      "pageNo": 1,
      "limit": 10,
      "total": 2,
      "hasNext": false,
      "hasPrev": false
    },
    "items": [
      {
        "id": 123,
        "batchId": 456,
        "recipientNumber": "+8613800138000",
        "directContent": null,
        "contentType": "template",
        "templateId": 1,
        "templateName": "验证码模板",
        "templateParams": {
          "code": "123456"
        },
        "status": "sent",
        "providerMessageId": "msg_xxx",
        "errorMessage": null,
        "sendTime": "2024-04-08T00:08:27.512Z",
        "statusUpdateTime": "2024-04-08T00:08:28.000Z"
      }
    ]
  }
}
```

## 权限控制

1. 管理员可查看所有租户的消息记录，可通过tenantId参数筛选特定租户
2. 普通用户只能查看本租户的消息记录

## 字段说明

| 字段名            | 类型   | 说明                                                                              |
| ----------------- | ------ | --------------------------------------------------------------------------------- |
| id                | number | 消息ID                                                                            |
| batchId           | number | 所属批次ID                                                                        |
| recipientNumber   | string | 接收者号码                                                                        |
| directContent     | string | 直接发送的内容（使用模板时为null）                                                |
| contentType       | string | 内容类型：template（模板）或direct（直接发送）                                    |
| templateId        | number | 模板ID                                                                            |
| templateName      | string | 模板名称                                                                          |
| templateParams    | object | 模板参数                                                                          |
| status            | string | 消息状态：pending/queued/submitted/sent/delivered/failed/rejected/unknown/sending |
| providerMessageId | string | 服务商消息ID                                                                      |
| errorMessage      | string | 错误信息（发送失败时）                                                            |
| sendTime          | string | 发送时间                                                                          |
| statusUpdateTime  | string | 状态更新时间                                                                      |

## 注意事项

1. 分页参数使用pageNo和limit，而不是page和pageSize
2. 支持按接收者号码模糊查询
3. 返回结果包含模板名称，方便前端展示
4. 时间字段使用ISO 8601格式
