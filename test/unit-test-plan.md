# SMS-Serve 项目单元测试规划

## 测试原则

1. **测试覆盖率目标**：核心业务逻辑至少80%覆盖率
2. **关注点**：
   - 控制器层 (Controllers)：接口参数验证、响应状态码和格式
   - 服务层 (Services)：业务逻辑、数据转换、异常处理
   - 工具类 (Utils)：辅助函数和工具方法
3. **模拟 (Mock)**：
   - 外部依赖：数据库、Redis、第三方API
   - 内部依赖：其他服务或模块
4. **测试隔离**：每个测试应独立运行，不依赖其他测试的结果

## 模块测试计划

### 1. 用户模块 (User Module)

- **Controller 测试**:
  - 用户注册接口
  - 用户信息获取接口
  - 用户更新接口
- **Service 测试**:
  - 用户创建逻辑
  - 用户查询逻辑
  - 用户更新逻辑
  - 密码哈希处理

### 2. 认证模块 (Auth Module)

- **Controller 测试**:
  - 登录接口
  - 获取当前用户信息接口
- **Service 测试**:
  - 用户验证逻辑
  - JWT签发逻辑
  - 密码验证逻辑
- **Guards 测试**:
  - JWT Guard 功能验证

### 3. 账户模块 (Account Module)

- **Controller 测试**:
  - 获取账户信息接口
  - 账户使用额度更新接口
- **Service 测试**:
  - 账户创建逻辑
  - 账户更新逻辑
  - 额度计算逻辑

### 4. 支付模块 (Payment Module)

- **Controller 测试**:
  - 充值请求接口
  - 支付状态查询接口
- **Service 测试**:
  - 支付单创建逻辑
  - 支付结果处理逻辑
  - 账户额度更新逻辑

### 5. 模板模块 (Template Module)

- **Controller 测试**:
  - 模板创建接口
  - 模板查询接口
  - 模板更新接口
  - 模板删除接口
- **Service 测试**:
  - 模板CRUD操作
  - 模板变量处理
  - 模板权限验证

### 6. 短信服务商模块 (SMS Provider Module)

- **Controller 测试**:
  - 服务商配置接口
  - 服务商状态查询接口
- **Service 测试**:
  - 服务商配置管理
  - 服务商选择逻辑
  - API调用封装

### 7. 通知模块 (Notification Module)

- **Controller 测试**:
  - 短信发送接口
  - 邮件发送接口
- **Service 测试**:
  - 发送请求验证
  - 批次创建逻辑
  - 队列任务创建
- **Processors 测试**:
  - 短信处理逻辑
  - 邮件处理逻辑

### 8. 状态模块 (Status Module)

- **Controller 测试**:
  - 短信批次状态查询接口
  - 邮件批次状态查询接口
  - 单条消息状态查询接口
- **Service 测试**:
  - 状态聚合逻辑
  - 权限验证逻辑

## 优先级和实施计划

按以下优先级实施测试：

1. **核心认证和用户模块**：这是所有功能的基础
2. **通知和模板模块**：直接面向最终用户的核心业务功能
3. **账户和支付模块**：涉及资金和额度的关键功能
4. **状态查询和其他辅助功能**

## 测试工具和库

- **Jest**: 测试框架
- **SuperTest**: HTTP测试
- **@nestjs/testing**: NestJS测试工具
- **jest-mock-extended**: 更强大的Mock工具

## 测试示例代码

以下为示例测试代码格式：

```typescript
describe('UserService', () => {
  let service: UserService;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    // 测试模块设置
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      // 测试实现
    });

    it('should throw an error if username already exists', async () => {
      // 测试实现
    });
  });
});
```
