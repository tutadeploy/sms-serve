import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { getWinstonLoggerConfig } from './common/config/logger.config';
import { WinstonModule } from 'nest-winston';
import { Request, Response } from 'express';

// 设置环境变量默认值
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

async function bootstrap() {
  // 使用 Winston 日志配置
  const winstonLogger = WinstonModule.createLogger(
    getWinstonLoggerConfig('SMS-Serve'),
  );

  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger, // 使用 Winston
  });
  const configService = app.get(ConfigService);

  // 安全中间件
  app.use(helmet());

  // CORS 配置
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (process.env.NODE_ENV === 'production' && corsOrigin) {
    winstonLogger.log(
      `Production CORS enabled for: ${corsOrigin}`,
      'Bootstrap',
    );
    app.enableCors({
      origin: corsOrigin.split(','), // 支持多个域名
      credentials: true,
    });
  } else {
    winstonLogger.warn(
      'CORS is enabled for all origins in non-production environment.',
      'Bootstrap',
    );
    app.enableCors({ credentials: true, origin: true });
  }

  // 设置全局路由前缀 (保留)
  app.setGlobalPrefix('v1');

  // 全局管道 (保留)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validateCustomDecorators: false,
      skipMissingProperties: true,
      disableErrorMessages: false,
    }),
  );

  // 全局过滤器和拦截器 (保留)
  app.useGlobalFilters(new HttpExceptionFilter(), new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // Swagger 文档 (仅非生产环境)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SMS 服务')
      .setDescription('SMS 服务 API 文档') // 可以简化描述
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
    winstonLogger.log(
      `Swagger documentation available at /api-docs`,
      'Bootstrap',
    );
  } else {
    winstonLogger.log(
      'Swagger documentation is disabled in production.',
      'Bootstrap',
    );
  }

  // 添加健康检查端点
  app.getHttpAdapter().get('/health', (req: Request, res: Response) => {
    // 简单的健康检查，可以根据需要扩展
    res.status(200).send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 启动应用 (监听 0.0.0.0)
  const port = configService.get<number>('APP_PORT') || 3000;
  await app.listen(port, '0.0.0.0');
  winstonLogger.log(
    `Application is running on: ${await app.getUrl()}`,
    'Bootstrap',
  );
  if (process.env.NODE_ENV !== 'production') {
    winstonLogger.log(
      `API docs available at: ${await app.getUrl()}/api-docs`,
      'Bootstrap',
    );
  }
}

void bootstrap();
