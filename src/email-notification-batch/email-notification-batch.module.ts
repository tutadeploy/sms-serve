import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailNotificationBatchService } from './email-notification-batch.service';
import { EmailNotificationBatch } from './entities/email-notification-batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailNotificationBatch])],
  providers: [EmailNotificationBatchService],
})
export class EmailNotificationBatchModule {}
