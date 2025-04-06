import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TestAppModule } from './test-app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../src/user/entities/user.entity';
import { SmsTemplate } from '../src/template/entities/sms-template.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';

describe('TemplateController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let smsTemplateRepository: Repository<SmsTemplate>;
  let jwtService: JwtService;

  // 测试数据
  let testUser: User;
  let accessToken: string;
  let testSmsTemplateId: number | undefined;

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
    smsTemplateRepository = moduleFixture.get<Repository<SmsTemplate>>(
      getRepositoryToken(SmsTemplate),
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
      username: 'templateuser',
      email: 'template@example.com',
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
      // 删除测试模板
      if (testSmsTemplateId) {
        await smsTemplateRepository.delete({ id: testSmsTemplateId });
      }

      // 删除测试用户
      if (testUser?.id) {
        await userRepository.delete({ id: testUser.id });
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  // SMS 模板测试
  describe('/template/sms (POST)', () => {
    it('should create a new SMS template', () => {
      return request(app.getHttpServer())
        .post('/template/sms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test SMS Template',
          content: 'Your verification code is {{code}}',
          variables: ['code'],
        })
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('name', 'Test SMS Template');
          expect(res.body.data).toHaveProperty(
            'content',
            'Your verification code is {{code}}',
          );
          expect(res.body.data).toHaveProperty('variables');
          expect(res.body.data.variables).toContain('code');

          // 保存ID用于后续测试
          testSmsTemplateId = res.body.data.id;
        });
    });

    it('should fail to create SMS template without authorization', () => {
      return request(app.getHttpServer())
        .post('/template/sms')
        .send({
          name: 'Unauthorized Template',
          content: 'This should fail',
          variables: [],
        })
        .expect(401);
    });
  });

  describe('/template/sms (GET)', () => {
    it('should get all SMS templates for the user', () => {
      return request(app.getHttpServer())
        .get('/template/sms')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });
  });

  describe('/template/sms/:id (GET)', () => {
    it('should get one SMS template by id', () => {
      return request(app.getHttpServer())
        .get(`/template/sms/${testSmsTemplateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id', testSmsTemplateId);
          expect(res.body.data).toHaveProperty('name', 'Test SMS Template');
        });
    });

    it('should return 404 for non-existent template', () => {
      return request(app.getHttpServer())
        .get('/template/sms/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/template/sms/:id (PATCH)', () => {
    it('should update an SMS template', () => {
      return request(app.getHttpServer())
        .patch(`/template/sms/${testSmsTemplateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated SMS Template',
          content: 'Your updated code is {{code}}',
        })
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id', testSmsTemplateId);
          expect(res.body.data).toHaveProperty('name', 'Updated SMS Template');
          expect(res.body.data).toHaveProperty(
            'content',
            'Your updated code is {{code}}',
          );
        });
    });
  });

  describe('/template/sms/:id (DELETE)', () => {
    it('should delete an SMS template', () => {
      return request(app.getHttpServer())
        .delete(`/template/sms/${testSmsTemplateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should return 404 after template is deleted', () => {
      return request(app.getHttpServer())
        .get(`/template/sms/${testSmsTemplateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // 测试结束后，设置为undefined，防止cleanup尝试再次删除
  afterAll(() => {
    testSmsTemplateId = undefined;
  });
});
