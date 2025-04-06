import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TestAppModule } from './test-app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../src/user/entities/user.entity';
import { Account } from '../src/account/entities/account.entity';
import { Payment } from '../src/payment/entities/payment.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('PaymentController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let accountRepository: Repository<Account>;
  let paymentRepository: Repository<Payment>;
  let jwtService: JwtService;

  // 测试数据
  let testUser: User;
  let testAccount: Account;
  let testPayment: Payment | null = null;
  let accessToken: string;

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
    accountRepository = moduleFixture.get<Repository<Account>>(
      getRepositoryToken(Account),
    );
    paymentRepository = moduleFixture.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );

    // 生成测试数据
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
      username: 'paymentuser',
      email: 'payment@example.com',
      passwordHash: passwordHash,
      role: UserRole.USER,
      isActive: true,
    });

    await userRepository.save(testUser);

    // 创建测试账户
    testAccount = accountRepository.create({
      name: 'Payment Test Account',
      userId: testUser.id,
      balance: 1000, // 初始余额设置为1000
      status: 'active',
    });

    await accountRepository.save(testAccount);

    // 生成 JWT token
    accessToken = jwtService.sign({
      sub: testUser.id,
      username: testUser.username,
      role: testUser.role,
      userId: testUser.id,
    });
  }

  // 清理测试数据
  async function cleanupTestData() {
    try {
      // 删除测试支付记录
      if (testPayment?.id) {
        await paymentRepository.delete({ id: testPayment.id });
      }

      // 删除所有测试用户的支付记录
      await paymentRepository.delete({ account: { id: testAccount.id } });

      // 删除测试账户
      if (testAccount?.id) {
        await accountRepository.delete({ id: testAccount.id });
      }

      // 删除测试用户
      if (testUser?.id) {
        await userRepository.delete({ id: testUser.id });
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  describe('/payment/deposit (POST)', () => {
    it('should process a deposit to the account', () => {
      const depositData = {
        accountId: testAccount.id,
        amount: 500,
        description: 'Test deposit',
        paymentMethod: 'credit_card',
        transactionId: `test-tx-${Date.now()}`,
      };

      return request(app.getHttpServer())
        .post('/payment/deposit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(depositData)
        .expect(201)
        .expect(async (res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('amount', 500);
          expect(res.body.data).toHaveProperty('type', 'deposit');
          expect(res.body.data).toHaveProperty('status', 'completed');

          // 保存支付ID用于后续测试和清理
          const createdPayment = await paymentRepository.findOne({
            where: { id: res.body.data.id },
          });
          if (createdPayment) {
            testPayment = createdPayment;
          }

          // 验证账户余额是否已更新
          const updatedAccount = await accountRepository.findOne({
            where: { id: testAccount.id },
          });
          expect(updatedAccount?.balance).toBe(1500); // 原始余额1000 + 充值500
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/payment/deposit')
        .send({
          accountId: testAccount.id,
          amount: 100,
          description: 'Unauthorized deposit',
        })
        .expect(401);
    });

    it('should validate amount is positive', () => {
      return request(app.getHttpServer())
        .post('/payment/deposit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: testAccount.id,
          amount: -100, // 负数金额
          description: 'Invalid deposit',
        })
        .expect(400);
    });
  });

  describe('/payment/balance/:accountId (GET)', () => {
    it('should return account balance', () => {
      return request(app.getHttpServer())
        .get(`/payment/balance/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('balance');
          expect(res.body.data.balance).toBeGreaterThanOrEqual(1500); // 至少应该有原始+充值的余额
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get(`/payment/balance/${testAccount.id}`)
        .expect(401);
    });

    it('should return 404 for non-existent account', () => {
      return request(app.getHttpServer())
        .get('/payment/balance/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/payment/history/:accountId (GET)', () => {
    it('should return payment history for the account', () => {
      return request(app.getHttpServer())
        .get(`/payment/history/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);

          // 检查是否包含我们的测试充值记录
          const depositRecord = res.body.data.find(
            (payment: any) => payment.id === testPayment?.id,
          );
          expect(depositRecord).toBeDefined();
          expect(depositRecord.amount).toBe(500);
          expect(depositRecord.type).toBe('deposit');
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get(`/payment/history/${testAccount.id}?page=1&limit=10`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeLessThanOrEqual(10);
          // 可能还需要检查分页元数据，如果API返回的话
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get(`/payment/history/${testAccount.id}`)
        .expect(401);
    });
  });

  describe('/payment/withdraw (POST)', () => {
    it('should process a withdrawal from the account', () => {
      const withdrawData = {
        accountId: testAccount.id,
        amount: 200,
        description: 'Test withdrawal',
        withdrawMethod: 'bank_transfer',
        bankInfo: {
          accountName: 'Test User',
          accountNumber: '123456789',
          bankName: 'Test Bank',
        },
      };

      return request(app.getHttpServer())
        .post('/payment/withdraw')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(withdrawData)
        .expect(201)
        .expect(async (res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('amount', 200);
          expect(res.body.data).toHaveProperty('type', 'withdrawal');

          // 状态可能是 pending 或 completed，取决于实现
          expect(['pending', 'completed']).toContain(res.body.data.status);

          // 验证账户余额是否已更新
          const updatedAccount = await accountRepository.findOne({
            where: { id: testAccount.id },
          });

          // 余额应该减少了200
          expect(updatedAccount?.balance).toBe(1300); // 1500 - 200
        });
    });

    it('should reject withdrawal if insufficient balance', () => {
      return request(app.getHttpServer())
        .post('/payment/withdraw')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: testAccount.id,
          amount: 5000, // 超过账户余额
          description: 'Excessive withdrawal',
        })
        .expect(400); // 或者其他适当的错误码
    });
  });
});
