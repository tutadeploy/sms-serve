import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailReceivedMessageService } from './email-received-message.service';
import { EmailReceivedMessage } from './entities/email-received-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailReceivedMessage])],
  providers: [EmailReceivedMessageService],
})
export class EmailReceivedMessageModule {}
