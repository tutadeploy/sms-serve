import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
// import { BullBoardModule } from '@bull-board/nestjs'; // 注释掉
// import { ExpressAdapter } from '@bull-board/express'; // 注释掉
// import { BullAdapter } from '@bull-board/api/bullAdapter'; // 注释掉
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { PaymentModule } from './payment/payment.module';
import { TemplateModule } from './template/template.module';
import { SmsModule } from './sms/sms.module';
import { SmsProviderModule } from './sms-provider/sms-provider.module';
import { EmailTemplateModule } from './email-template/email-template.module';
import { SmsNotificationBatchModule } from './sms-notification-batch/sms-notification-batch.module';
import { EmailNotificationBatchModule } from './email-notification-batch/email-notification-batch.module';
import { SmsMessageModule } from './sms-message/sms-message.module';
import { EmailMessageModule } from './email-message/email-message.module';
import { SmsReceivedMessageModule } from './sms-received-message/sms-received-message.module';
import { EmailReceivedMessageModule } from './email-received-message/email-received-message.module';
import { NotificationModule } from './notification/notification.module';
import { StatusModule } from './status/status.module';
import { CaptchaModule } from './captcha/captcha.module';
import { getTypeOrmModuleOptions } from './common/config/typeorm.config';
import { configs } from './config';
import { TenantModule } from './tenant/tenant.module';
import { SsoModule } from './sso/sso.module';
import { DictModule } from './system/dict.module';
import { NotifyMessageModule } from './system/notify-message.module';

// 创建 ExpressAdapter 实例
// const serverAdapter = new ExpressAdapter(); // 注释掉
// serverAdapter.setBasePath('/admin/queues'); // 注释掉

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      load: configs,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getTypeOrmModuleOptions(configService),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
    }),
    // BullBoardModule.forRootAsync({ // 注释掉
    //   useFactory: () => ({
    //     route: '/admin/queues',
    //     adapter: serverAdapter,
    //   }),
    // }),
    // BullBoardModule.forFeature({ // 注释掉
    //   name: 'sms',
    //   adapter: BullAdapter,
    // }),
    // BullBoardModule.forFeature({ // 注释掉
    //   name: 'email',
    //   adapter: BullAdapter,
    // }),
    UserModule,
    AuthModule,
    AccountModule,
    PaymentModule,
    TemplateModule,
    SmsModule,
    SmsProviderModule,
    EmailTemplateModule,
    SmsNotificationBatchModule,
    EmailNotificationBatchModule,
    SmsMessageModule,
    EmailMessageModule,
    SmsReceivedMessageModule,
    EmailReceivedMessageModule,
    NotificationModule,
    StatusModule,
    CaptchaModule,
    TenantModule,
    SsoModule,
    DictModule,
    NotifyMessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
