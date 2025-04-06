import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SmsProviderService } from './sms-provider.service';
import { SmsProviderController } from './sms-provider.controller';
import { SmsProvider } from './entities/sms-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmsProvider]), HttpModule, ConfigModule],
  controllers: [SmsProviderController],
  providers: [SmsProviderService],
  exports: [SmsProviderService, TypeOrmModule],
})
export class SmsProviderModule {}
