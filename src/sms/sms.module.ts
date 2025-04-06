import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { SmsService } from './sms.service';
import { SmsProcessor } from './sms.processor';
import { SmsNotificationBatch } from '../sms-notification-batch/entities/sms-notification-batch.entity';
import { SmsMessage } from '../sms-message/entities/sms-message.entity';
import { SmsProvider } from '../sms-provider/entities/sms-provider.entity';
import { SmsDispatcherModule } from '../sms-dispatcher/sms-dispatcher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmsNotificationBatch, SmsMessage, SmsProvider]),
    BullModule.registerQueue({ name: 'sms' }),
    SmsDispatcherModule,
  ],
  providers: [SmsService, SmsProcessor],
  exports: [SmsService],
})
export class SmsModule {}
