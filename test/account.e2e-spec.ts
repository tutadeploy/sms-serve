import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TestAppModule } from './test-app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../src/user/entities/user.entity';
import { Account } from '../src/account/entities/account.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AccountController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let accountRepository: Repository<Account>;
  let jwtService: JwtService;

  // 测试数据
  let testUser: User;
  let testAccount: Account | null = null;
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
      username: 'accounttestuser',
      email: 'accounttest@example.com',
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
      userId: testUser.id,
    });
  }

  // 清理测试数据
  async function cleanupTestData() {
    try {
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

  describe('/account (POST)', () => {
    it('should create a new account', () => {
      return request(app.getHttpServer())
        .post('/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Account',
          description: 'Test account description',
        })
        .expect(201)
        .expect(async (res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('name', 'Test Account');
          expect(res.body.data).toHaveProperty(
            'description',
            'Test account description',
          );
          expect(res.body.data).toHaveProperty('userId', testUser.id);

          // 保存账户ID用于后续测试和清理
          const createdAccount = await accountRepository.findOne({
            where: { id: res.body.data.id },
          });
          if (createdAccount) {
            testAccount = createdAccount;
          }
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/account')
        .send({
          name: 'Unauthorized Account',
          description: 'This should fail',
        })
        .expect(401);
    });
  });

  describe('/account (GET)', () => {
    it('should return all accounts for the user', () => {
      return request(app.getHttpServer())
        .get('/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);

          // 检查返回的账户是否属于测试用户
          const userAccounts = res.body.data.filter(
            (account: any) => account.userId === testUser.id,
          );
          expect(userAccounts.length).toBeGreaterThan(0);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/account').expect(401);
    });
  });

  describe('/account/:id (GET)', () => {
    it('should return a specific account by ID', () => {
      // 确保测试账户已创建
      if (!testAccount?.id) {
        throw new Error('Test account not created yet');
      }

      return request(app.getHttpServer())
        .get(`/account/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id', testAccount?.id);
          expect(res.body.data).toHaveProperty('name', 'Test Account');
          expect(res.body.data).toHaveProperty('userId', testUser.id);
        });
    });

    it('should return 404 for non-existent account', () => {
      return request(app.getHttpServer())
        .get('/account/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 403 for account not owned by user', async () => {
      // 创建另一个用户和他的账户
      const otherUser = userRepository.create({
        username: 'otheruser',
        email: 'other@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: UserRole.USER,
        isActive: true,
      });

      await userRepository.save(otherUser);

      const otherAccount = accountRepository.create({
        name: 'Other Account',
        userId: otherUser.id,
      });

      await accountRepository.save(otherAccount);

      try {
        // 尝试访问其他用户的账户
        await request(app.getHttpServer())
          .get(`/account/${otherAccount.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(403);
      } finally {
        // 清理其他用户的测试数据
        await accountRepository.delete({ id: otherAccount.id });
        await userRepository.delete({ id: otherUser.id });
      }
    });
  });

  describe('/account/:id (PATCH)', () => {
    it('should update an account', () => {
      // 确保测试账户已创建
      if (!testAccount?.id) {
        throw new Error('Test account not created yet');
      }

      return request(app.getHttpServer())
        .patch(`/account/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Test Account',
          description: 'Updated description',
        })
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id', testAccount?.id);
          expect(res.body.data).toHaveProperty('name', 'Updated Test Account');
          expect(res.body.data).toHaveProperty(
            'description',
            'Updated description',
          );
        });
    });
  });
});
