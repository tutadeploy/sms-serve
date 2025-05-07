# SMPP渠道开发计划

## 项目概述

开发一个新的短信发送渠道模块(SMPP)，该渠道与现有的Buka渠道类似，使用REST API进行调用。该渠道专注于香港地区的短信发送服务。

## 开发目标

1. 基于现有Buka渠道实现，开发SMPP渠道服务模块
2. 确保与SMPP API服务对接，包括发送短信、查询余额和获取发送记录等功能
3. 将新渠道集成到现有短信服务系统中
4. 支持租户和用户级别的配置

## 阶段一：基础结构搭建（2天）

### 任务1.1：创建SMPP模块文件结构

- 创建`src/sms-provider/smpp`目录
- 创建基础文件：
  - `smpp-base.service.ts`：基础服务类
  - `smpp.service.ts`：主服务实现类
  - `smpp.module.ts`：模块定义
  - `decorators/smpp-request.decorator.ts`：签名生成等辅助函数

### 任务1.2：实现认证和基础功能

- 实现`SmppBaseService`，处理凭证加载与请求封装
- 实现请求认证装饰器(`getSmppHeaders`)，确保API调用安全
- 实现模块依赖注入配置

## 阶段二：核心功能实现（3天）

### 任务2.1：实现账户余额查询功能

- 实现`getBalance`方法，支持租户ID和AppID两种调用方式
- 确保正确处理API响应和错误情况
- 添加日志记录和异常处理

### 任务2.2：实现单条短信发送功能

- 实现`send`方法，支持发送单条短信
- 处理发送结果和错误情况
- 支持消息ID追踪

### 任务2.3：实现批量短信发送功能

- 实现`sendSmsBatch`方法，支持批量发送短信
- 确保正确处理部分成功、部分失败的情况
- 优化批量请求处理

### 任务2.4：实现短信状态查询功能

- 实现`queryMessageStatusByIds`方法，支持查询短信发送状态
- 实现不同状态的映射和统计
- 支持批量查询和结果整合

## 阶段三：模块集成（2天）

### 任务3.1：修改SmsProviderModule

- 在`src/sms-provider/sms-provider.module.ts`中引入SMPP模块
- 确保正确设置依赖注入关系

### 任务3.2：修改SmsProviderService

- 更新服务选择逻辑，支持SMPP渠道
- 确保渠道切换逻辑无缝衔接

### 任务3.3：数据库配置

- 确保`sms_providers`表中添加SMPP渠道配置，可以通过sql脚本进行查看
- 确保租户配置表支持SMPP渠道设置

## 阶段四：测试与优化（3天）

### 任务4.1：单元测试

- 为SMPP服务编写单元测试
- 测试各核心功能的正确性
- 测试错误处理和边界情况

### 任务4.2：集成测试

- 测试SMPP渠道与现有系统的集成
- 验证渠道选择和切换逻辑
- 测试与实际SMPP API的交互

### 任务4.3：性能优化

- 优化缓存使用
- 优化错误处理逻辑
- 确保并发请求处理能力

## 阶段五：文档与部署（2天）

### 任务5.1：编写文档

- 更新API文档，增加SMPP渠道说明
- 编写配置说明和使用手册
- 记录关键实现细节和注意事项

### 任务5.2：部署与监控

- 部署新渠道服务
- 设置监控指标
- 确保日志记录完整

## 风险与注意事项

1. SMPP服务仅支持香港地区，需要确保地区限制逻辑正确
2. 认证机制与Buka类似但可能有细微差异，需要仔细验证
3. 调用超时和异常情况处理需要特别关注
4. 需确保不影响现有Buka渠道功能

## 完成标准

1. 所有计划功能完整实现
2. 通过所有单元测试和集成测试
3. 文档完善
4. 成功部署并可供租户使用

好的，我们开始第三阶段的开发。
阶段三：模块集成
根据您的开发计划，阶段三主要包括：
任务3.1：修改SmsProviderModule
在 src/sms-provider/sms-provider.module.ts 中引入SMPP模块
确保正确设置依赖注入关系
任务3.2：修改SmsProviderService
更新服务选择逻辑，支持SMPP渠道
确保渠道切换逻辑无缝衔接
任务3.3：数据库配置
确保 sms_providers 表中添加SMPP渠道配置
确保租户配置表支持SMPP渠道设置
任务3.1和3.2我们已经在阶段二的核心功能实现过程中一并完成了。
SmsProviderModule (src/sms-provider/sms-provider.module.ts) 已经正确导入并导出了 SmppModule。
SmsProviderService (src/sms-provider/sms-provider.service.ts) 已经注入了 SmppService，并且 getProviderService 方法也已实现，可以根据渠道名称返回对应的服务实例。
因此，阶段三主要剩余的任务是 任务3.3：数据库配置。
这项任务需要您在数据库中手动进行以下操作：
在 sms_providers 表中添加SMPP渠道的基础配置：
name: 'smpp'
display_name: 'SMPP Channel' (或您希望的显示名称)
base_url: 指向您的SMPP API服务的URL (例如: http://123.253.110.98:13000)
is_active: true
config_details: 可以为空或者包含一些此渠道特有的全局配置（如果需要）。
在 tenant_channel_configs 表中为租户配置SMPP渠道的认证信息：
您提到已经为租户1配置了相关信息，请确保这条记录的 channel 字段为 'smpp'。
tenantId: 对应的租户ID (例如: 1)
channel: 'smpp'
apiKey: 您的SMPP服务的API Key
apiSecret: 您的SMPP服务的API Secret
config_details: 应该包含此租户的 appId，例如：{"appId": "your_tenant_specific_appid"}
isActive: true
（可选）在 user_channel_configs 表中为特定用户配置SMPP渠道的 appId：
如果某个用户需要使用与租户配置不同的 appId，可以在此表为该用户添加一条记录。
userId: 对应的用户ID
channel: 'smpp'
config_details: 包含此用户的 appId，例如：{"appId": "your_user_specific_appid"}
isActive: true
请您检查并确认数据库配置是否已按上述说明完成。一旦数据库配置就绪，SMPP渠道的集成工作就基本完成了。
完成数据库配置后，我们可以继续进行阶段四：测试与优化。
