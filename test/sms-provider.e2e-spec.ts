import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TestAppModule } from './test-app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../src/user/entities/user.entity';
import { SmsProvider } from '../src/sms-provider/entities/sms-provider.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('SmsProviderController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let smsProviderRepository: Repository<SmsProvider>;
  let jwtService: JwtService;

  // 测试数据
  let testUser: User;
  let testProvider: SmsProvider | null = null;
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
    smsProviderRepository = moduleFixture.get<Repository<SmsProvider>>(
      getRepositoryToken(SmsProvider),
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
      username: 'provideruser',
      email: 'provider@example.com',
      passwordHash: passwordHash,
      role: UserRole.ADMIN, // 管理员角色可以管理提供商
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
      // 删除测试提供商
      if (testProvider?.id) {
        await smsProviderRepository.delete({ id: testProvider.id });
      }

      // 删除测试用户
      if (testUser?.id) {
        await userRepository.delete({ id: testUser.id });
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  describe('/sms-provider (POST)', () => {
    it('should create a new SMS provider', () => {
      const providerData = {
        name: 'Test Provider',
        type: 'onbuka', // 提供商类型
        config: {
          apiKey: 'test-api-key',
          apiSecret: 'test-api-secret',
          baseUrl: 'https://api.example.com',
        },
        isActive: true,
      };

      return request(app.getHttpServer())
        .post('/sms-provider')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(providerData)
        .expect(201)
        .expect(async (res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('name', 'Test Provider');
          expect(res.body.data).toHaveProperty('type', 'onbuka');
          expect(res.body.data).toHaveProperty('isActive', true);

          // 保存提供商ID用于后续测试和清理
          const createdProvider = await smsProviderRepository.findOne({
            where: { id: res.body.data.id },
          });
          if (createdProvider) {
            testProvider = createdProvider;
          }
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/sms-provider')
        .send({
          name: 'Unauthorized Provider',
          type: 'onbuka',
          config: {
            apiKey: 'test-key',
            apiSecret: 'test-secret',
          },
        })
        .expect(401);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/sms-provider')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          // Missing required fields
          type: 'onbuka',
        })
        .expect(400);
    });
  });

  describe('/sms-provider (GET)', () => {
    it('should return all SMS providers', () => {
      return request(app.getHttpServer())
        .get('/sms-provider')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);

          // 验证是否不返回敏感信息
          const providers = res.body.data;
          for (const provider of providers) {
            expect(provider).not.toHaveProperty('apiSecret');
            expect(provider).not.toHaveProperty('config.apiSecret');
          }
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/sms-provider').expect(401);
    });
  });

  describe('/sms-provider/:id (GET)', () => {
    it('should return a specific SMS provider by ID', () => {
      // 确保测试提供商已创建
      if (!testProvider?.id) {
        throw new Error('Test provider not created yet');
      }

      return request(app.getHttpServer())
        .get(`/sms-provider/${testProvider.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id', testProvider?.id);
          expect(res.body.data).toHaveProperty('name', 'Test Provider');
          expect(res.body.data).not.toHaveProperty('apiSecret');
        });
    });

    it('should return 404 for non-existent provider', () => {
      return request(app.getHttpServer())
        .get('/sms-provider/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/sms-provider/:id (PATCH)', () => {
    it('should update an SMS provider', () => {
      // 确保测试提供商已创建
      if (!testProvider?.id) {
        throw new Error('Test provider not created yet');
      }

      return request(app.getHttpServer())
        .patch(`/sms-provider/${testProvider.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Provider',
          isActive: false,
        })
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id', testProvider?.id);
          expect(res.body.data).toHaveProperty('name', 'Updated Provider');
          expect(res.body.data).toHaveProperty('isActive', false);
        });
    });
  });

  describe('/sms-provider/:id/test (POST)', () => {
    it('should test the SMS provider connection', () => {
      // 确保测试提供商已创建
      if (!testProvider?.id) {
        throw new Error('Test provider not created yet');
      }

      // 注意：这个测试假设有一个测试端点来验证提供商的连接
      return request(app.getHttpServer())
        .post(`/sms-provider/${testProvider.id}/test`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('success');
          // 如果测试环境下实际连接会失败，可以调整期望
          // expect(res.body.data.success).toBe(true);
        });
    });
  });
});
