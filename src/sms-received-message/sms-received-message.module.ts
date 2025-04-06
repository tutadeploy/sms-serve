import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsReceivedMessageService } from './sms-received-message.service';
import { SmsReceivedMessage } from './entities/sms-received-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmsReceivedMessage])],
  providers: [SmsReceivedMessageService],
})
export class SmsReceivedMessageModule {}
