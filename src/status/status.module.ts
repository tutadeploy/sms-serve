import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { SmsNotificationBatch } from '../sms-notification-batch/entities/sms-notification-batch.entity';
import { EmailNotificationBatch } from '../email-notification-batch/entities/email-notification-batch.entity';
import { SmsMessage } from '../sms-message/entities/sms-message.entity';
import { EmailMessage } from '../email-message/entities/email-message.entity';
import { SmsReceivedMessage } from '../sms-received-message/entities/sms-received-message.entity';
import { User } from '../user/entities/user.entity';
import { EmailReceivedMessage } from '../email-received-message/entities/email-received-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmsNotificationBatch,
      EmailNotificationBatch,
      SmsMessage,
      EmailMessage,
      SmsReceivedMessage,
      User,
      EmailReceivedMessage,
    ]),
  ],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
