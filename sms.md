# 包裹表单流程与API接口文档

## 功能概述

包裹表单功能允许用户通过识别码提交和管理他们的包裹信息。整个流程包括生成识别码、验证识别码、提交表单信息以及查询表单详情。

## API接口

### 1. 生成包裹表单识别码

生成或获取用户的包裹表单识别码。

- **路径**: `GET /v1/system/users/package-form-code/:userId`
- **权限**: 需要JWT认证
- **参数**:
  - `userId`: 用户ID (路径参数)
- **响应**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "code": "96809115" // 8位识别码
    }
  }
  ```

### 2. 通过识别码查找用户

验证识别码并获取对应的用户信息。

- **路径**: `GET /v1/system/users/by-form-code/:code`
- **权限**: 需要JWT认证
- **参数**:
  - `code`: 包裹表单识别码 (路径参数)
- **响应**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": 1,
      "username": "admin",
      "email": null,
      "role": "admin",
      "isActive": true,
      "tenantId": null,
      "createdAt": "2025-04-06T15:19:23.000Z",
      "updatedAt": "2025-04-07T08:17:23.000Z"
    }
  }
  ```

### 3. 提交包裹表单

使用识别码提交包裹表单信息。

- **路径**: `POST /v1/pkgform/update-form`
- **权限**: 不需要JWT认证
- **请求体**:
  ```json
  {
    "identificationCode": "8b202d58",
    "name": "Test User",
    "address1": "123 Main St",
    "address2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "email": "test@example.com",
    "phone": "1234567890",
    "cardholder": "Test User",
    "cardNumber": "4111111111111111",
    "expireDate": "12/2025",
    "cvv": "123"
  }
  ```
- **响应**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": "1",
      "userId": 1,
      "name": "Test User",
      "address1": "123 Main St",
      "address2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "email": "test@example.com",
      "phone": "1234567890",
      "cardholder": "Test User",
      "cardNumberEncrypted": "...",
      "expireDate": "12/2025",
      "cvvEncrypted": "...",
      "createdAt": "2025-04-07T08:22:25.000Z",
      "updatedAt": "2025-04-07T08:22:25.000Z"
    }
  }
  ```

### 4. 获取包裹表单

获取用户的包裹表单信息。

- **路径**: `GET /v1/pkgform/get-form`
- **权限**: 需要JWT认证
- **参数**: 无（从JWT token中获取用户ID）
- **响应**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": "1",
      "userId": 1,
      "name": "Test User",
      "address1": "123 Main St",
      "address2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "email": "test@example.com",
      "phone": "1234567890",
      "cardholder": "Test User",
      "cardNumber": "************1111",
      "expireDate": "12/2025",
      "cvv": "***",
      "createdAt": "2025-04-07T08:22:25.000Z",
      "updatedAt": "2025-04-07T08:22:25.000Z"
    }
  }
  ```

## 安全特性

1. **敏感数据加密**

   - 信用卡号和CVV使用AES-256-CBC加密存储
   - 加密密钥通过环境变量配置
   - 返回数据时对敏感信息进行掩码处理

2. **数据验证**

   - 所有输入数据通过DTO进行验证
   - 识别码固定为8位字符
   - 信用卡有效期格式为"MM/YYYY"
   - CVV长度为3-4位

3. **访问控制**
   - 管理接口需要JWT认证
   - 表单提交接口通过识别码验证用户身份

## 使用流程

1. 管理员通过用户ID生成包裹表单识别码
2. 将识别码提供给用户
3. 用户使用识别码提交包裹表单
4. 管理员可以通过JWT认证查看已提交的表单信息

## 注意事项

1. 识别码是一次性的，生成后会与用户绑定
2. 敏感信息（信用卡号、CVV）在传输和存储时都需要加密
3. 查询表单时，敏感信息会自动进行掩码处理
4. 表单提交成功后，可以通过get-form接口查询最新提交的表单信息
