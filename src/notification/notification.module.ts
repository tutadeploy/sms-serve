import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { NotificationService } from './notification.service';
import { TemplateModule } from '../template/template.module';
import { SmsProviderModule } from '../sms-provider/sms-provider.module';
import { SmsDispatcherModule } from '../sms-dispatcher/sms-dispatcher.module';
import { SmsChannelConfigModule } from '../sms-channel-config/sms-channel-config.module';
import { SmsModule } from '../sms/sms.module';
import { SmsNotificationBatch } from '../sms-notification-batch/entities/sms-notification-batch.entity';
import { EmailNotificationBatch } from '../email-notification-batch/entities/email-notification-batch.entity';
import { SmsMessage } from '../sms-message/entities/sms-message.entity';
import { EmailMessage } from '../email-message/entities/email-message.entity';
import { NotificationController } from './notification.controller';
import { UserModule } from '../user/user.module';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      SmsNotificationBatch,
      EmailNotificationBatch,
      SmsMessage,
      EmailMessage,
    ]),
    TemplateModule,
    SmsProviderModule,
    SmsDispatcherModule,
    SmsChannelConfigModule,
    SmsModule,
    UserModule,
    BullModule.registerQueue({ name: 'sms' }, { name: 'email' }),
  ],
  providers: [NotificationService, EmailProcessor],
  exports: [NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}
