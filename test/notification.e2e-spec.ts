import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TestAppModule } from './test-app.module';
import { JwtService } from '@nestjs/jwt';
import { User } from '../src/user/entities/user.entity';
import { SmsProvider } from '../src/sms-provider/entities/sms-provider.entity';
import { SmsTemplate } from '../src/template/entities/sms-template.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SmsNotificationBatch,
  BatchStatus,
} from '../src/sms-notification-batch/entities/sms-notification-batch.entity';
import { SmsMessage } from '../src/sms-message/entities/sms-message.entity';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { UserModule } from '../src/user/user.module';
import { SmsProviderModule } from '../src/sms-provider/sms-provider.module';
import { TemplateModule } from '../src/template/template.module';

describe('NotificationModule (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userRepository: Repository<User>;
  let smsProviderRepository: Repository<SmsProvider>;
  let smsTemplateRepository: Repository<SmsTemplate>;
  let smsBatchRepository: Repository<SmsNotificationBatch>;
  let smsMessageRepository: Repository<SmsMessage>;
  let smsQueue: Queue;

  // 测试数据
  let testUser: User;
  let testProvider: SmsProvider;
  let testTemplate: SmsTemplate;
  let authToken: string;
  let testBatchId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule, UserModule, SmsProviderModule, TemplateModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // 获取服务
    jwtService = moduleFixture.get<JwtService>(JwtService);
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    smsProviderRepository = moduleFixture.get<Repository<SmsProvider>>(
      getRepositoryToken(SmsProvider),
    );
    smsTemplateRepository = moduleFixture.get<Repository<SmsTemplate>>(
      getRepositoryToken(SmsTemplate),
    );
    smsBatchRepository = moduleFixture.get<Repository<SmsNotificationBatch>>(
      getRepositoryToken(SmsNotificationBatch),
    );
    smsMessageRepository = moduleFixture.get<Repository<SmsMessage>>(
      getRepositoryToken(SmsMessage),
    );
    smsQueue = moduleFixture.get<Queue>(getQueueToken('sms'));

    // 清空测试队列 (确保测试隔离)
    await smsQueue.empty();

    // 创建测试数据
    await setupTestData();
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();
    // 关闭队列连接
    await smsQueue.close();
    await app.close();
  });

  // 设置测试数据
  async function setupTestData() {
    // 创建测试用户
    testUser = userRepository.create({
      username: 'testuser',
      email: 'test@example.com',
    });
    testUser.password = 'password123';
    await userRepository.save(testUser);

    // 创建测试服务商
    testProvider = smsProviderRepository.create({
      name: 'onbuka',
      isActive: true,
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      baseUrl: 'https://api.example.com',
    });
    await smsProviderRepository.save(testProvider);

    // 创建测试模板
    testTemplate = smsTemplateRepository.create({
      name: 'Test Template',
      content: 'Hello {{name}}, your verification code is {{code}}',
      userId: testUser.id,
      variables: ['name', 'code'], // 添加变量列表
    });
    await smsTemplateRepository.save(testTemplate);

    // 生成 JWT token
    authToken = jwtService.sign({
      sub: testUser.id,
      username: testUser.username,
      userId: testUser.id,
    });
  }

  // 清理测试数据
  async function cleanupTestData() {
    try {
      // 删除测试消息
      if (testBatchId) {
        await smsMessageRepository.delete({ batchId: testBatchId });
        // 删除测试批次
        await smsBatchRepository.delete({ id: testBatchId });
      }

      // 删除测试模板
      if ((testTemplate as SmsTemplate | undefined)?.id) {
        await smsTemplateRepository.delete({
          id: testTemplate.id,
        });
      }

      // 删除测试服务商
      if ((testProvider as SmsProvider | undefined)?.id) {
        await smsProviderRepository.delete({
          id: testProvider.id,
        });
      }

      // 删除测试用户
      if ((testUser as User | undefined)?.id) {
        await userRepository.delete({ id: testUser.id });
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  describe('/notification/sms (POST)', () => {
    it.skip('should create a pending batch and queue the SMS job using template', async () => {
      const recipient = '+8613800138000';
      const variables = { name: 'Test User', code: '123456' };

      const response = await request(app.getHttpServer())
        .post('/notification/sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId: testProvider.id,
          templateId: testTemplate.id,
          recipients: [recipient],
          variables: variables,
        })
        .expect(201);

      // 验证返回的批次信息
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'pending'); // 状态应为 PENDING
      expect(response.body).toHaveProperty('totalRecipients', 1);
      expect(response.body).toHaveProperty('processedCount', 0); // 初始为 0
      expect(response.body).toHaveProperty('sentCount', 0);
      expect(response.body).toHaveProperty('failedCount', 0);

      const batchId = response.body.id as number;
      testBatchId = batchId; // 保存用于清理

      // 等待一小段时间让任务入队 (非最佳实践，仅用于简化测试)
      await new Promise((res) => setTimeout(res, 100));

      // 验证队列中是否有任务
      const jobs = await smsQueue.getJobs(['waiting', 'active', 'delayed']);
      expect(jobs.length).toBeGreaterThan(0);

      // 验证数据库中对应的 SmsMessage 状态
      const message = await smsMessageRepository.findOne({
        where: { batchId: batchId, recipientNumber: recipient },
      });
      expect(message).toBeDefined();
      expect(message?.status).toEqual('queued'); // 状态应为 queued

      // 验证队列中的任务数据 (可选，更详细)
      let job;
      if (message) {
        job = jobs.find(
          (j) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            j.data.messageId === message.id,
        );
      } else {
        job = undefined;
      }
      expect(job).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(job?.data.batchId).toEqual(batchId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(job?.data.recipient).toEqual(recipient);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(job?.data.provider.id).toEqual(testProvider.id);
      // 验证模板替换后的内容
      const expectedContent = `Hello ${variables.name}, your verification code is ${variables.code}`;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(job?.data.content).toEqual(expectedContent);

      return response;
    });

    it.skip('should create a pending batch and queue the SMS job with direct content', async () => {
      const recipient = '+8613800138001';
      const content = 'This is a direct SMS message';

      const response = await request(app.getHttpServer())
        .post('/notification/sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId: testProvider.id,
          content: content,
          recipients: [recipient],
        })
        .expect(201);

      // 验证批次信息
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('totalRecipients', 1);

      const batchId = response.body.id as number;

      await new Promise((res) => setTimeout(res, 100));

      // 验证数据库中消息状态
      const message = await smsMessageRepository.findOne({
        where: { batchId: batchId, recipientNumber: recipient },
      });
      expect(message).toBeDefined();
      expect(message?.status).toEqual('queued');

      // 验证队列任务
      const jobs = await smsQueue.getJobs(['waiting', 'active', 'delayed']);
      let job;
      if (message) {
        job = jobs.find(
          (j) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            j.data.messageId === message.id,
        );
      } else {
        job = undefined;
      }
      expect(job).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(job?.data.content).toEqual(content);
    });

    it('should fail with invalid provider ID', async () => {
      return request(app.getHttpServer())
        .post('/notification/sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId: 99999, // 不存在的服务商ID
          content: 'Test message',
          recipients: ['+8613800138002'],
        })
        .expect(404);
    });

    it('should fail with invalid template ID', async () => {
      return request(app.getHttpServer())
        .post('/notification/sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId: testProvider.id,
          templateId: 99999, // 不存在的模板ID
          recipients: ['+8613800138003'],
        })
        .expect(404);
    });

    it('should fail without content or templateId', async () => {
      return request(app.getHttpServer())
        .post('/notification/sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId: testProvider.id,
          recipients: ['+8613800138004'],
        })
        .expect(400);
    });
  });

  describe('/status/sms/batch/:id (GET)', () => {
    it('should get SMS batch status (initial: PENDING)', async () => {
      // 确保有测试批次ID
      if (!testBatchId) {
        const batch = await smsBatchRepository.findOne({
          where: { userId: testUser.id },
        });
        testBatchId = batch?.id || 0;
      }

      if (testBatchId) {
        return request(app.getHttpServer())
          .get(`/status/sms/batch/${testBatchId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res: request.Response) => {
            expect(res.body).toHaveProperty('id', testBatchId);
            expect(res.body).toHaveProperty('status', 'pending'); // 初始状态
            // 其他计数字段初始应为 0 或根据创建逻辑设定
            expect(res.body).toHaveProperty('processedCount', 0);
          });
      }
    });

    it('should fail with non-existent batch ID', async () => {
      return request(app.getHttpServer())
        .get('/status/sms/batch/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/status/sms/message/:id (GET)', () => {
    it('should get SMS message status (initial: queued)', async () => {
      // 查找测试消息
      const message = await smsMessageRepository.findOne({
        where: { batchId: testBatchId }, // 假设第一个测试创建了消息
      });

      if (message) {
        return request(app.getHttpServer())
          .get(`/status/sms/message/${message.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res: request.Response) => {
            expect(res.body).toHaveProperty('id', message.id);
            expect(res.body).toHaveProperty('status', 'queued'); // 初始状态
            expect(res.body).toHaveProperty('recipientNumber');
          });
      }
    });

    it('should fail with non-existent message ID', async () => {
      return request(app.getHttpServer())
        .get('/status/sms/message/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
