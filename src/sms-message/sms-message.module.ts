import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsMessageService } from './sms-message.service';
import { SmsMessage } from './entities/sms-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmsMessage])],
  providers: [SmsMessageService],
})
export class SmsMessageModule {}
