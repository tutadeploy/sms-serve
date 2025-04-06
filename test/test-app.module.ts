import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

// 模块导入
import { AuthModule } from '../src/auth/auth.module';
import { UserModule } from '../src/user/user.module';
import { TemplateModule } from '../src/template/template.module';
import { SmsProviderModule } from '../src/sms-provider/sms-provider.module';
import { NotificationModule } from '../src/notification/notification.module';
import { StatusModule } from '../src/status/status.module';

/**
 * 专为端到端测试设计的应用模块
 * 使用内存数据库，避免外部依赖
 */
@Module({
  imports: [
    // 配置管理
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),

    // 数据库配置 - 使用SQLite内存数据库用于测试
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: ['src/**/*.entity{.ts,.js}'],
      synchronize: true,
      autoLoadEntities: true,
      namingStrategy: new SnakeNamingStrategy(),
      extra: {
        useNullAsDefault: true,
      },
    }),

    // 消息队列
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),

    // 认证
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'test-secret'),
        signOptions: { expiresIn: '1h' },
      }),
    }),

    // 框架模块
    PassportModule,

    // 应用模块
    AuthModule,
    UserModule,
    TemplateModule,
    SmsProviderModule,
    NotificationModule,
    StatusModule,
  ],
})
export class TestAppModule {}
