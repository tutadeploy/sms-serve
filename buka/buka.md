# Buka SMS API 文档摘要

本文档总结了 Buka SMS 平台常用 API 的关键信息，基于官方文档整理。

## 1. 签名鉴权

所有 API 请求都需要通过签名鉴权。

**签名 (Sign) 生成方法:**

将 `API Key`、`API Secret` 和 `Timestamp` (当前系统时间戳，秒级) 拼接在一起，计算其 MD5-32 位哈希值 (不区分大小写)。

**示例:**

- API Key: `bDqJFiq9`
- API Secret: `7bz1lzh9`
- Timestamp: `1630468800`
- 拼接后字符串: `bDqJFiq97bz1lzh91630468800`
- 计算 MD5: `05d7a50893e22a5c4bb3216ae3396c7c`

**请求头 (Request Headers):**

| Header 参数  | 说明                             | 类型   | 必需 |
| :----------- | :------------------------------- | :----- | :--- |
| Content-Type | `application/json;charset=UTF-8` | String | 是   |
| Sign         | 计算得到的 MD5 签名              | String | 是   |
| Timestamp    | 当前系统时间戳 (秒)              | String | 是   |
| Api-Key      | 您的 API Key                     | String | 是   |

## 2. 发送短信 (Sending SMS)

### 2.1 发送单条或多条相同内容短信

- **API Endpoint:** `POST v3/sendSms`
- **说明:** 支持向单个或多个号码发送相同内容的短信。GET方式一次最多提交100个号码，POST方式一次最多提交1000个号码。
- **请求参数 (JSON Body):**

  | 参数       | 说明                                         | 类型   | 必需 |
  | :--------- | :------------------------------------------- | :----- | :--- |
  | `appId`    | 应用 ID                                      | String | 是   |
  | `numbers`  | 接收号码列表，多个号码用英文逗号 `,` 分隔    | String | 是   |
  | `content`  | 短信内容，最大 1024 字节                     | String | 是   |
  | `senderId` | 发送号码（需报备），最大 32 字符             | String | 否   |
  | `orderId`  | 自定义消息 ID (可选，建议与号码数量保持一致) | String | 否   |

- **请求示例 (POST):**
  ```json
  {
    "appId": "4luaKsL2",
    "numbers": "91856321412,91856321413",
    "content": "helloworld",
    "senderId": "123",
    "orderId": "21412,21413"
  }
  ```
- **响应示例 (成功):**
  ```json
  {
    "status": "0",
    "reason": "success",
    "success": "2", // 成功提交的号码个数
    "fail": "0", // 失败的号码个数
    "array": [
      // 对应成功提交号码的消息详情
      {
        "msgId": "2108021054011000095", // 平台生成的消息ID
        "number": "91856321412",
        "orderId": "21412"
      },
      {
        "msgId": "2108021059531000096",
        "number": "91856321413",
        "orderId": "21413"
      }
    ]
  }
  ```

## 3. 查询短信发送结果 (Querying Status)

### 3.1 查询指定消息 ID 的发送结果

- **API Endpoint:** `POST /v3/getReport`
- **说明:** 根据发送后返回的 `msgId` 查询短信的最终发送结果。
- **请求参数 (JSON Body):**

  | 参数     | 说明                                          | 类型   | 必需 |
  | :------- | :-------------------------------------------- | :----- | :--- |
  | `appId`  | 应用 ID                                       | String | 是   |
  | `msgids` | 要查询的消息 ID 列表，多个用英文逗号 `,` 分隔 | String | 是   |

- **请求示例:**
  ```json
  {
    "appId": "4luaKsL2",
    "msgids": "2108021054011000095,2108021059531000096"
  }
  ```
- **响应示例 (成功):**
  ```json
  {
    "status": "0",
    "reason": "success",
    "success": "2", // 查询成功的条数
    "fail": "0", // 查询失败的条数
    "sending": "0", // 仍在发送中的条数
    "nofound": "0", // 未找到的条数
    "array": [
      {
        "msgId": "2108021054011000095",
        "number": "91856321412",
        "receiveTime": "2021-02-12T09:30:03+08:00", // 发送时间 (ISO8601)
        "status": "0" // 状态码 (0:发送成功, 1:发送中, -1:发送失败)
      },
      {
        "msgId": "2108021059531000096",
        "number": "91856321413",
        "receiveTime": "2021-02-12T09:30:03+08:00",
        "status": "0"
      }
    ]
  }
  ```

### 3.2 查询时间段内发送的短信结果

- **API Endpoint:** `POST /v3/getSentRcd`
- **说明:** 查询指定时间段内发送完成的短信结果。
- **请求参数 (JSON Body):**

  | 参数         | 说明                                                           | 类型   | 必需       |
  | :----------- | :------------------------------------------------------------- | :----- | :--------- |
  | `appId`      | 应用 ID                                                        | String | 是         |
  | `startTime`  | 查询开始时间 (ISO8601 格式)                                    | String | 是         |
  | `endTime`    | 查询结束时间 (ISO8601 格式)                                    | String | 是         |
  | `startIndex` | 查询的起始下标 (分页用，默认 0，每次查询最多返回 50000 个结果) | Int    | 否 (默认0) |

- **请求示例:**
  ```json
  {
    "appId": "4luaKsL2",
    "startTime": "2021-02-12T00:00:00+08:00",
    "endTime": "2021-02-12T23:59:59+08:00",
    "startIndex": 0
  }
  ```
- **响应示例 (成功):**
  ```json
  {
    "status": "0",
    "reason": "success",
    "success": "2",
    "fail": "0",
    "array": [
      {
        "msgId": "2108021054011000095",
        "number": "91856321412",
        "receiveTime": "2021-02-12T09:30:03+08:00",
        "status": "0"
      },
      {
        "msgId": "2108021059531000096",
        "number": "91856321413",
        "receiveTime": "2021-02-12T09:30:03+08:00",
        "status": "0"
      }
    ]
  }
  ```

## 4. 上行短信记录查询 (Querying MO Records)

- **API Endpoint:** `POST /v3/recordMo`
- **说明:** 查询用户接收到的上行短信记录。
- **请求参数 (JSON Body):**

  | 参数        | 说明                        | 类型   | 必需 |
  | :---------- | :-------------------------- | :----- | :--- |
  | `appId`     | 应用 ID                     | String | 是   |
  | `current`   | 当前页码，从 1 开始         | Int    | 是   |
  | `size`      | 每页记录数                  | Int    | 是   |
  | `startTime` | 查询开始时间 (ISO8601 格式) | String | 是   |
  | `endTime`   | 查询结束时间 (ISO8601 格式) | String | 是   |

- **请求示例:**
  ```json
  {
    "appId": "4luaKsL2",
    "size": 10,
    "current": 1,
    "startTime": "2022-08-01T00:00:00+08:00",
    "endTime": "2022-08-01T23:59:59+08:00"
  }
  ```
- **响应示例 (成功):**
  ```json
  {
    "status": "0",
    "reason": "success",
    "data": {
      "total": 1, // 总记录数
      "current": 1, // 当前页码
      "pages": 1, // 总页数
      "records": [
        // 当前页记录
        {
          "mobiles": "918xxxxxxxxx", // 发送方号码
          "receiveTime": "2022-08-02 01:17:41+08:00", // 接收时间
          "content": "hello", // 短信内容
          "meno": "",
          "operator": "India",
          "province": null,
          "city": null,
          "chargeCnt": 1,
          "currency": "EUR",
          "price": 0.1
        }
      ]
    }
  }
  ```

## 5. PB状态报告回调 (Status Callback)

- **说明:** Buka平台会通过HTTP(S) POST方式将短信发送状态推送到客户配置的回调地址。

- **回调请求参数:**

  | 参数       | 说明                                       | 类型   |
  | :--------- | :----------------------------------------- | :----- |
  | `msgId`    | Buka平台生成的消息ID                       | String |
  | `phone`    | 接收号码                                   | String |
  | `status`   | 状态码 (0:发送成功, 1:发送中, -1:发送失败) | String |
  | `time`     | 状态报告接收时间                           | String |
  | `orderId`  | 客户提交时的自定义消息ID                   | String |
  | `appId`    | 应用ID                                     | String |
  | `network`  | 运营商                                     | String |
  | `statDesc` | 状态描述                                   | String |

- **回调请求示例:**

  ```json
  {
    "msgId": "2108021054011000095",
    "phone": "91856321412",
    "status": "0",
    "time": "2021-08-02 10:54:30",
    "orderId": "21412",
    "appId": "4luaKsL2",
    "network": "India-Airtel",
    "statDesc": "DELIVRD"
  }
  ```

- **客户端应返回的响应:**
  ```
  ok
  ```

## 6. 通用状态码说明

| 状态码 | 说明                           |
| :----- | :----------------------------- |
| 0      | 成功                           |
| -1     | 认证错误                       |
| -2     | IP 访问受限                    |
| -3     | 短信内容含有敏感字符           |
| -4     | 短信内容为空                   |
| -5     | 短信内容过长                   |
| -8     | 号码为空                       |
| -9     | 号码异常                       |
| -10    | 客户余额不足                   |
| -16    | timestamp expires (时间戳过期) |
| -18    | 接口异常                       |
| -22    | 参数异常                       |
| -24    | 数据不存在                     |
