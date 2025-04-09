import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SmsProviderService } from './sms-provider.service';
import { SmsProviderController } from './sms-provider.controller';
import { SmsProvider } from './entities/sms-provider.entity';
import { BukaModule } from './buka/buka.module';
import { TenantChannelConfig } from '../sms-channel-config/entities/tenant-channel-config.entity';
import { UserChannelConfig } from '../sms-channel-config/entities/user-channel-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmsProvider,
      TenantChannelConfig,
      UserChannelConfig,
    ]),
    HttpModule,
    ConfigModule,
    BukaModule,
  ],
  controllers: [SmsProviderController],
  providers: [SmsProviderService],
  exports: [SmsProviderService, TypeOrmModule, BukaModule],
})
export class SmsProviderModule {}
