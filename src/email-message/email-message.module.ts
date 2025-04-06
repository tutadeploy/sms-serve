import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailMessageService } from './email-message.service';
import { EmailMessage } from './entities/email-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailMessage])],
  providers: [EmailMessageService],
})
export class EmailMessageModule {}
