import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsTemplate } from './entities/sms-template.entity';
import { EmailTemplate } from '../email-template/entities/email-template.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmsTemplate, EmailTemplate, User])],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService, TypeOrmModule],
})
export class TemplateModule {}
