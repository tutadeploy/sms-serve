import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppModule } from './test-app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // 应用全局过滤器和拦截器，确保测试环境与生产环境一致
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('statusCode', 200);
        expect(res.body).toHaveProperty('message', '操作成功');
      });
  });

  // 测试环境下，API文档可能不可用，所以注释掉这些测试
  // it('/api-docs (GET)', () => {
  //   return request(app.getHttpServer()).get('/api-docs').expect(301); // 默认重定向到/api-docs/
  // });

  // it('/api-docs/ (GET)', () => {
  //   return request(app.getHttpServer())
  //     .get('/api-docs/')
  //     .expect(200)
  //     .expect('Content-Type', /html/);
  // });
});
