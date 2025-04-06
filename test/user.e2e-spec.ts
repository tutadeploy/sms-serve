import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TestAppModule } from './test-app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../src/user/entities/user.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  // 测试数据
  let testUser: User;
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
    // 创建测试管理员用户
    const passwordHash = await bcrypt.hash('password123', 10);

    testUser = userRepository.create({
      username: 'adminuser',
      email: 'admin@example.com',
      passwordHash: passwordHash,
      role: UserRole.ADMIN,
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
      // 删除所有测试用户
      await userRepository.delete({ username: 'newuser' });

      // 删除管理员测试用户
      if (testUser?.id) {
        await userRepository.delete({ id: testUser.id });
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  describe('/user/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/user/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('username', 'newuser');
          expect(res.body.data).toHaveProperty('email', 'newuser@example.com');
          expect(res.body.data).not.toHaveProperty('passwordHash'); // 不应返回密码哈希
        });
    });

    it('should return 400 when username already exists', () => {
      return request(app.getHttpServer())
        .post('/user/register')
        .send({
          username: 'newuser', // 已存在的用户名
          email: 'another@example.com',
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 400 when email already exists', () => {
      return request(app.getHttpServer())
        .post('/user/register')
        .send({
          username: 'anotheruser',
          email: 'newuser@example.com', // 已存在的邮箱
          password: 'password123',
        })
        .expect(400);
    });

    it('should validate password complexity', () => {
      return request(app.getHttpServer())
        .post('/user/register')
        .send({
          username: 'complexuser',
          email: 'complex@example.com',
          password: '123', // 太简单的密码
        })
        .expect(400);
    });
  });

  describe('/user/profile (GET)', () => {
    it('should return user profile for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('username', testUser.username);
          expect(res.body.data).toHaveProperty('email', testUser.email);
          expect(res.body.data).not.toHaveProperty('passwordHash'); // 不应返回密码哈希
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/user/profile').expect(401);
    });
  });

  describe('/user (GET) - Admin only', () => {
    it('should return user list for admin users', () => {
      return request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/user').expect(401);
    });
  });
});
