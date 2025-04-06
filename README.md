<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# SMS-Serve 短信服务平台

一个基于NestJS框架的短信/邮件发送服务平台，支持多渠道服务商，提供模板管理、消息批量发送、状态查询等功能。

## 项目特点

- **多渠道支持**：集成多个短信和邮件服务提供商
- **模板管理**：支持创建和管理短信/邮件模板
- **消息批量发送**：高效的队列处理系统
- **状态查询**：实时查询短信/邮件发送状态
- **完善的API文档**：基于Swagger生成的接口文档
- **统一的响应格式**：标准化的成功/错误响应
- **强大的日志系统**：基于Winston的分级日志
- **TypeORM集成**：灵活的数据库访问层

## 技术栈

- **后端框架**：NestJS
- **数据库**：MySQL
- **ORM**：TypeORM
- **缓存**：Redis
- **队列**：Bull
- **文档**：Swagger/OpenAPI
- **日志**：Winston
- **容器化**：Docker/Docker Compose

## 快速开始

### 环境要求

- Node.js 16+
- Docker & Docker Compose (可选)
- MySQL 8.0+
- Redis 6.0+

### 使用Docker安装

1. 克隆仓库

```bash
git clone https://github.com/your-repo/sms-serve.git
cd sms-serve
```

2. 启动Docker容器

```bash
docker-compose up -d
```

3. 安装依赖并启动服务

```bash
pnpm install
pnpm start:dev
```

4. 访问Swagger文档

```
http://localhost:3000/api-docs
```

### 手动安装

1. 克隆仓库并安装依赖

```bash
git clone https://github.com/your-repo/sms-serve.git
cd sms-serve
pnpm install
```

2. 配置环境变量

```bash
cp .env.example .env
# 编辑.env文件，设置数据库和Redis连接信息
```

3. 启动数据库和Redis

```bash
# 可以使用本地安装的MySQL和Redis
# 或者使用Docker启动
docker-compose up -d mysql redis
```

4. 创建数据库并执行迁移

```bash
# 如果使用Docker，初始化脚本会自动创建数据库
# 否则需要手动创建
mysql -u root -p
> CREATE DATABASE sms_serve_db;
> GRANT ALL PRIVILEGES ON sms_serve_db.* TO 'sms_serve_user'@'%' IDENTIFIED BY 'smsserver';
> FLUSH PRIVILEGES;
> EXIT;

# 执行迁移
pnpm migration:run
```

5. 启动服务

```bash
# 开发模式
pnpm start:dev

# 生产模式
pnpm build
pnpm start:prod
```

## 项目优化

为了提高项目质量和开发效率，我们实施了以下优化：

### 1. 统一的错误处理

- 全局HTTP异常过滤器
- 标准化错误响应格式
- 详细的错误日志记录

### 2. 规范的API响应

- 全局响应拦截器
- 统一的成功响应格式
- 清晰的API状态和消息

### 3. 增强的日志系统

- 基于Winston的分级日志
- 日志文件轮转策略
- 开发/生产环境日志级别区分

### 4. 统一的TypeORM配置

- 解决了配置冲突问题
- 支持开发和迁移场景
- 统一的命名策略

### 5. 完善的API文档

- Swagger自动文档生成
- 详细的API描述和示例
- 导出OpenAPI规范

## 功能模块

- **用户模块**：用户注册、登录、信息管理
- **认证模块**：JWT认证、权限控制
- **账户模块**：账户管理、额度控制
- **支付模块**：充值、订单管理
- **模板模块**：短信/邮件模板管理
- **服务商模块**：短信/邮件服务商配置
- **通知模块**：发送短信/邮件
- **状态模块**：查询发送状态

## API文档

项目集成了Swagger文档，启动服务后访问：

```
http://localhost:3000/api-docs
```

也可以查看项目根目录下的`openapi.json`获取完整的API规范。

## 开发指南

项目遵循NestJS最佳实践，使用模块化结构：

```
src/
├── common/           # 通用工具和配置
├── user/             # 用户模块
├── auth/             # 认证模块
├── account/          # 账户模块
├── payment/          # 支付模块
├── template/         # 模板模块
├── sms-provider/     # 短信服务商模块
├── notification/     # 通知模块
├── status/           # 状态查询模块
```

### 测试

```bash
# 单元测试
pnpm test

# e2e测试
pnpm test:e2e

# 测试覆盖率
pnpm test:cov
```

## 生产环境部署

1. 构建项目

```bash
pnpm build
```

2. 配置生产环境变量

```bash
# 设置NODE_ENV
export NODE_ENV=production

# 配置其他环境变量
# ...
```

3. 启动服务

```bash
# 使用PM2
pm2 start dist/main.js --name sms-serve

# 或直接启动
node dist/main.js
```

## 贡献

欢迎贡献代码或提交问题。请先Fork本仓库，然后提交Pull Request。

## 许可

[MIT License](LICENSE)
