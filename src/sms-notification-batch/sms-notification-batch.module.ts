import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsNotificationBatchService } from './sms-notification-batch.service';
import { SmsNotificationBatch } from './entities/sms-notification-batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmsNotificationBatch])],
  providers: [SmsNotificationBatchService],
  exports: [SmsNotificationBatchService, TypeOrmModule],
})
export class SmsNotificationBatchModule {}
