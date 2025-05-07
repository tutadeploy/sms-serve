import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SmsProviderService } from './sms-provider.service';
import { SmsProviderController } from './sms-provider.controller';
import { SmsProvider } from './entities/sms-provider.entity';
import { BukaModule } from './buka/buka.module';
import { SmppModule } from './smpp/smpp.module';
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
    forwardRef(() => BukaModule),
    forwardRef(() => SmppModule),
  ],
  controllers: [SmsProviderController],
  providers: [SmsProviderService],
  exports: [
    SmsProviderService,
    TypeOrmModule,
    forwardRef(() => BukaModule),
    forwardRef(() => SmppModule),
  ],
})
export class SmsProviderModule {}
