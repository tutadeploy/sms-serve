import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsTrackingService } from './sms-tracking.service';
import { SmsDispatchBatch } from '../sms/entities/sms-dispatch-batch.entity';
import { SmsMessage } from '../sms/entities/sms-message.entity';
import { SmsNotificationBatchModule } from '../sms-notification-batch/sms-notification-batch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmsDispatchBatch, SmsMessage]),
    SmsNotificationBatchModule,
  ],
  providers: [SmsTrackingService],
  exports: [SmsTrackingService, TypeOrmModule], // 导出服务和TypeOrmModule
})
export class SmsTrackingModule {}
