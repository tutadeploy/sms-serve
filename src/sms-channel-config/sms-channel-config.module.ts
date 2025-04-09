import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { TenantChannelConfig } from './entities/tenant-channel-config.entity';
import { UserChannelConfig } from './entities/user-channel-config.entity';
import { ChannelSupportedCountry } from './entities/channel-supported-country.entity';
import { SmsChannelConfigService } from './sms-channel-config.service';
import { SmsChannelConfigController } from './sms-channel-config.controller';
import { BukaSmsChannelService } from './channels/buka-sms-channel.service';
import { UserModule } from '../user/user.module';
import { TenantModule } from '../tenant/tenant.module';
import { BukaModule } from '../sms-provider/buka/buka.module';
import { SmsProvider } from '../sms-provider/entities/sms-provider.entity';
import { SmsProviderModule } from '../sms-provider/sms-provider.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantChannelConfig,
      UserChannelConfig,
      ChannelSupportedCountry,
      SmsProvider,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    UserModule,
    TenantModule,
    forwardRef(() => BukaModule),
    forwardRef(() => SmsProviderModule),
  ],
  controllers: [SmsChannelConfigController],
  providers: [SmsChannelConfigService, BukaSmsChannelService],
  exports: [SmsChannelConfigService, BukaSmsChannelService],
})
export class SmsChannelConfigModule {}
