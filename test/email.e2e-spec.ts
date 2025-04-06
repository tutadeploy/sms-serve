import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { JwtService } from '@nestjs/jwt';

import { AppModule } from '../src/app.module';
import { EmailNotificationBatch } from '../src/email-notification-batch/entities/email-notification-batch.entity';
import { EmailMessage } from '../src/email-message/entities/email-message.entity';
import { EmailTemplate } from '../src/email-template/entities/email-template.entity';
import { User } from '../src/user/entities/user.entity';
import { Account } from '../src/account/entities/account.entity';

describe('Email Module (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let emailQueue: Queue;

  // 存储测试数据的 ID
  const testData = {
    userId: 0,
    accountId: 0,
    templateId: 0,
    token: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 获取所需的服务和存储库
    jwtService = moduleFixture.get<JwtService>(JwtService);
    emailQueue = moduleFixture.get<Queue>(getQueueToken('email'));

    // 准备测试数据
    await setupTestData();
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();
    await app.close();
  });

  // 设置测试数据
  async function setupTestData() {
    // 创建测试用户
    const userRepository = app.get(getRepositoryToken(User));
    const testUser = userRepository.create({
      username: `test-user-${Date.now()}`,
      password: 'password123',
      name: 'Test User',
      mobile: '13800138000',
      email: `test-${Date.now()}@example.com`,
      status: 1,
    });
    const savedUser = await userRepository.save(testUser);
    testData.userId = savedUser.id;

    // 创建账户
    const accountRepository = app.get(getRepositoryToken(Account));
    const testAccount = accountRepository.create({
      name: 'Test Account',
      userId: savedUser.id,
      status: 1,
    });
    const savedAccount = await accountRepository.save(testAccount);
    testData.accountId = savedAccount.id;

    // 创建邮件模板
    const templateRepository = app.get(getRepositoryToken(EmailTemplate));
    const testTemplate = templateRepository.create({
      name: 'Test Email Template',
      subject: 'Test Email Subject',
      bodyHtml: 'Hello, {{name}}! This is a test email.',
      bodyText: 'Hello, {{name}}! This is a test email.',
      accountId: savedAccount.id,
      code: 'TEST_EMAIL_TPL_001',
      status: 1,
    });
    const savedTemplate = await templateRepository.save(testTemplate);
    testData.templateId = savedTemplate.id;

    // 生成 JWT 令牌
    testData.token = jwtService.sign({
      sub: savedUser.id,
      username: savedUser.username,
    });
  }

  // 清理测试数据
  async function cleanupTestData() {
    if (testData.templateId) {
      const templateRepository = app.get(getRepositoryToken(EmailTemplate));
      await templateRepository.delete(testData.templateId);
    }

    // 清理批次和消息数据
    const batchRepository = app.get(getRepositoryToken(EmailNotificationBatch));
    const batches = await batchRepository.find({
      where: { account: { id: testData.accountId } },
    });

    const messageRepository = app.get(getRepositoryToken(EmailMessage));
    for (const batch of batches) {
      await messageRepository.delete({ batch: { id: batch.id } });
      await batchRepository.delete(batch.id);
    }

    if (testData.accountId) {
      const accountRepository = app.get(getRepositoryToken(Account));
      await accountRepository.delete(testData.accountId);
    }

    if (testData.userId) {
      const userRepository = app.get(getRepositoryToken(User));
      await userRepository.delete(testData.userId);
    }
  }

  // 模拟邮件队列处理
  function mockQueueProcessing() {
    // 清空队列中的任务
    jest.spyOn(emailQueue, 'add').mockImplementation(async (name, data) => {
      console.log(`Mock queue processed job: ${name}`, data);
      return { id: 'mock-job-id' } as any;
    });
  }

  describe('/notification/email (POST)', () => {
    beforeEach(() => {
      mockQueueProcessing();
    });

    it('should create a batch and queue email jobs for multiple recipients', async () => {
      // 测试参数
      const emailPayload = {
        templateId: testData.templateId,
        recipients: [
          {
            email: 'user1@example.com',
            params: { name: 'User1' },
          },
          {
            email: 'user2@example.com',
            params: { name: 'User2' },
          },
        ],
      };

      // 发送请求
      const response = await supertest(app.getHttpServer())
        .post('/notification/email')
        .set('Authorization', `Bearer ${testData.token}`)
        .send(emailPayload)
        .expect(201);

      // 验证响应
      expect(response.body).toHaveProperty('batchId');
      expect(response.body).toHaveProperty('messageCount', 2);

      // 验证批次创建
      const batchRepository = app.get(
        getRepositoryToken(EmailNotificationBatch),
      );
      const batch = await batchRepository.findOne({
        where: { id: response.body.batchId },
        relations: ['account'],
      });

      expect(batch).toBeDefined();
      expect(batch.account.id).toBe(testData.accountId);
      expect(batch.status).toBe('pending');

      // 验证消息创建
      const messageRepository = app.get(getRepositoryToken(EmailMessage));
      const messages = await messageRepository.find({
        where: { batch: { id: response.body.batchId } },
      });

      expect(messages.length).toBe(2);
      expect(messages[0].status).toBe('pending');
      expect(messages[1].status).toBe('pending');

      // 验证队列调用
      expect(emailQueue.add).toHaveBeenCalledTimes(2);
    });

    it('should return 400 for invalid template', async () => {
      const emailPayload = {
        templateId: 9999, // 不存在的模板
        recipients: [
          {
            email: 'user1@example.com',
            params: { name: 'User1' },
          },
        ],
      };

      await supertest(app.getHttpServer())
        .post('/notification/email')
        .set('Authorization', `Bearer ${testData.token}`)
        .send(emailPayload)
        .expect(400);
    });

    it('should accept direct content without template', async () => {
      const emailPayload = {
        subject: 'Test Direct Email',
        body: '<p>This is a direct email without template</p>',
        recipients: [
          {
            email: 'user1@example.com',
          },
        ],
      };

      const response = await supertest(app.getHttpServer())
        .post('/notification/email')
        .set('Authorization', `Bearer ${testData.token}`)
        .send(emailPayload)
        .expect(201);

      expect(response.body).toHaveProperty('batchId');
      expect(response.body).toHaveProperty('messageCount', 1);
    });

    it('should return 401 for unauthorized request', async () => {
      const emailPayload = {
        templateId: testData.templateId,
        recipients: [
          {
            email: 'user1@example.com',
            params: { name: 'User1' },
          },
        ],
      };

      await supertest(app.getHttpServer())
        .post('/notification/email')
        .send(emailPayload)
        .expect(401);
    });
  });

  describe('/status/email/:batchId (GET)', () => {
    let testBatchId: number;

    beforeEach(async () => {
      // 创建一个测试批次用于状态查询
      const batchRepository = app.get(
        getRepositoryToken(EmailNotificationBatch),
      );
      const testBatch = batchRepository.create({
        account: { id: testData.accountId },
        status: 'pending',
        emailTemplate: { id: testData.templateId },
        totalCount: 2,
        successCount: 0,
        failedCount: 0,
      });
      const savedBatch = await batchRepository.save(testBatch);
      testBatchId = savedBatch.id;

      // 为批次创建消息
      const messageRepository = app.get(getRepositoryToken(EmailMessage));
      const testMessages = [
        messageRepository.create({
          batch: { id: testBatchId },
          recipientEmail: 'user1@example.com',
          subject: 'Hello, User1!',
          status: 'pending',
        }),
        messageRepository.create({
          batch: { id: testBatchId },
          recipientEmail: 'user2@example.com',
          subject: 'Hello, User2!',
          status: 'pending',
        }),
      ];
      await messageRepository.save(testMessages);
    });

    it('should return batch status', async () => {
      const response = await supertest(app.getHttpServer())
        .get(`/status/email/${testBatchId}`)
        .set('Authorization', `Bearer ${testData.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testBatchId);
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('totalCount', 2);
      expect(response.body).toHaveProperty('successCount', 0);
      expect(response.body).toHaveProperty('failedCount', 0);
      expect(response.body).toHaveProperty('messages');
      expect(response.body.messages.length).toBe(2);
    });

    it('should return 404 for non-existent batch', async () => {
      await supertest(app.getHttpServer())
        .get('/status/email/9999')
        .set('Authorization', `Bearer ${testData.token}`)
        .expect(404);
    });

    it('should return 403 for batch not belonging to user', async () => {
      // 创建一个新用户和账户
      const userRepository = app.get(getRepositoryToken(User));
      const newUser = userRepository.create({
        username: `other-user-${Date.now()}`,
        password: 'password123',
        name: 'Other User',
        mobile: '13900139000',
        email: `other-${Date.now()}@example.com`,
        status: 1,
      });
      const savedNewUser = await userRepository.save(newUser);

      // 生成新用户的令牌
      const otherToken = jwtService.sign({
        sub: savedNewUser.id,
        username: savedNewUser.username,
      });

      // 使用新用户的令牌尝试访问
      await supertest(app.getHttpServer())
        .get(`/status/email/${testBatchId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      // 清理新用户
      await userRepository.delete(savedNewUser.id);
    });
  });
});
