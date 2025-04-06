import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TestAppModule } from './test-app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../src/user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { SmsMessage } from '../src/sms-message/entities/sms-message.entity';
import {
  SmsNotificationBatch,
  SmsBatchStatus,
} from '../src/sms-notification-batch/entities/sms-notification-batch.entity';

// 使用SmsMessage中定义的消息状态类型
type SmsStatus =
  | 'queued'
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'rejected';

describe('StatusController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let smsBatchRepository: Repository<SmsNotificationBatch>;
  let smsMessageRepository: Repository<SmsMessage>;
  let jwtService: JwtService;

  // 测试数据
  let testUser: User;
  let accessToken: string;
  let testBatchId: number;
  let testMessageId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    await app.init();

    // 获取需要的服务和仓库
    jwtService = moduleFixture.get<JwtService>(JwtService);
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    smsBatchRepository = moduleFixture.get<Repository<SmsNotificationBatch>>(
      getRepositoryToken(SmsNotificationBatch),
    );
    smsMessageRepository = moduleFixture.get<Repository<SmsMessage>>(
      getRepositoryToken(SmsMessage),
    );

    // 创建测试数据
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
    const passwordHash = await bcrypt.hash('password123', 10);

    testUser = userRepository.create({
      username: 'statususer',
      email: 'status@example.com',
      passwordHash: passwordHash,
      role: UserRole.USER,
      isActive: true,
    });

    await userRepository.save(testUser);

    // 生成 JWT token
    accessToken = jwtService.sign({
      sub: testUser.id,
      username: testUser.username,
      role: testUser.role,
    });

    // 创建测试批次
    const batch = smsBatchRepository.create({
      userId: testUser.id,
      status: SmsBatchStatus.PENDING,
      totalRecipients: 1,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      smsProviderId: 1, // 假设存在一个ID为1的短信提供商
      content: 'Test message content',
    });

    const savedBatch = await smsBatchRepository.save(batch);
    testBatchId = savedBatch.id;

    // 创建测试消息
    const message = smsMessageRepository.create({
      batchId: testBatchId,
      recipientNumber: '+1234567890',
      status: 'queued' as SmsStatus,
    });

    const savedMessage = await smsMessageRepository.save(message);
    testMessageId = savedMessage.id;
  }

  // 清理测试数据
  async function cleanupTestData() {
    try {
      // 删除测试消息
      if (testMessageId) {
        await smsMessageRepository.delete({ id: testMessageId });
      }

      // 删除测试批次
      if (testBatchId) {
        await smsBatchRepository.delete({ id: testBatchId });
      }

      // 删除测试用户
      if (testUser?.id) {
        await userRepository.delete({ id: testUser.id });
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  describe('/status/sms/batch/:id (GET)', () => {
    it('should get SMS batch status', () => {
      return request(app.getHttpServer())
        .get(`/status/sms/batch/${testBatchId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.data).toHaveProperty('id', testBatchId);
          expect(res.body.data).toHaveProperty(
            'status',
            SmsBatchStatus.PENDING,
          );
          expect(res.body.data).toHaveProperty('processedCount', 0);
        });
    });

    it('should fail with non-existent batch ID', () => {
      return request(app.getHttpServer())
        .get('/status/sms/batch/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authorization', () => {
      return request(app.getHttpServer())
        .get(`/status/sms/batch/${testBatchId}`)
        .expect(401);
    });
  });

  describe('/status/sms/message/:id (GET)', () => {
    it('should get SMS message status', () => {
      return request(app.getHttpServer())
        .get(`/status/sms/message/${testMessageId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.data).toHaveProperty('id', testMessageId);
          expect(res.body.data).toHaveProperty('status', 'queued');
          expect(res.body.data).toHaveProperty(
            'recipientNumber',
            '+1234567890',
          );
        });
    });

    it('should fail with non-existent message ID', () => {
      return request(app.getHttpServer())
        .get('/status/sms/message/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authorization', () => {
      return request(app.getHttpServer())
        .get(`/status/sms/message/${testMessageId}`)
        .expect(401);
    });
  });
});
