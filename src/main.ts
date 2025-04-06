import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { writeFileSync } from 'fs';
import { WinstonModule } from 'nest-winston';
import { getWinstonLoggerConfig } from './common/config/logger.config';
import helmet from 'helmet';
import { join } from 'path';
import * as express from 'express';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  // 创建Winston日志实例
  const winstonLogger = WinstonModule.createLogger(
    getWinstonLoggerConfig('SMS-Serve'),
  );

  // 使用Winston日志创建应用实例
  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
  });

  // 添加安全头，但排除某些可能引起跨域问题的头
  app.use(
    helmet({
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      originAgentCluster: false,
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT') || 3000;

  // 设置全局过滤器，处理所有未捕获的异常
  app.useGlobalFilters(new HttpExceptionFilter(), new GlobalExceptionFilter());

  app.setGlobalPrefix('/');

  // 全局响应拦截器 - 统一成功响应格式
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(app.get(Reflector)),
  );

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('SMS Serve API')
    .setDescription('API documentation for the SMS Serving application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // 导出OpenAPI规范到JSON文件
  const outputPath = join(process.cwd(), 'public');
  writeFileSync(join(outputPath, 'openapi.json'), JSON.stringify(document));
  winstonLogger.log(
    'OpenAPI specification exported to public/openapi.json',
    'Bootstrap',
  );

  // 提供静态文件服务
  app.use('/public', express.static(join(process.cwd(), 'public')));

  // 配置Swagger UI，确保使用HTTP而非HTTPS
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      filter: true,
      urls: [
        {
          url: './api-docs-json',
          name: 'SMS Serve API',
        },
      ],
      docExpansion: 'none',
    },
    customSiteTitle: 'SMS Serve API Documentation',
    explorer: true,
    jsonDocumentUrl: 'api-docs-json',
  });

  // 配置CORS - 允许所有局域网内的客户端访问
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? configService.get<string>('CORS_ORIGINS', '').split(',') // 生产环境使用配置的域名列表
        : [
            'http://localhost:3000',
            'http://localhost:8080',
            /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
            /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
          ], // 测试环境允许localhost和局域网IP
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 3600, // 预检请求缓存时间，单位秒
  });

  await app.listen(port, '0.0.0.0'); // 监听所有网络接口
  winstonLogger.log(`应用程序正在运行: ${await app.getUrl()}`, 'Bootstrap');
  winstonLogger.log(
    `Swagger文档地址: ${await app.getUrl()}/api-docs`,
    'Bootstrap',
  );
}
bootstrap().catch((err) => {
  console.error('应用程序启动失败:', err);
  process.exit(1);
});
