import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager'; //  NestJS v9+ uses @nestjs/cache-manager
import { SmppService } from './smpp.service';
import { TenantChannelConfig } from '../../sms-channel-config/entities/tenant-channel-config.entity';
import { UserChannelConfig } from '../../sms-channel-config/entities/user-channel-config.entity';
import { SmsProvider } from '../entities/sms-provider.entity';
// SmsProviderModule will be imported where SmppModule is used, typically in a higher-level module.
// We might need to use forwardRef if SmppModule and SmsProviderModule have circular dependencies.
// For now, we assume SmppModule is imported by SmsProviderModule.

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantChannelConfig,
      UserChannelConfig,
      SmsProvider, // SmppBaseService depends on SmsProviderRepository
    ]),
    HttpModule.register({
      timeout: 10000, // Consistent with BukaModule
      maxRedirects: 5, // Consistent with BukaModule
    }),
    CacheModule.register({
      ttl: 300, // 5 minutes, consistent with BukaModule and SmppService
    }),
    // forwardRef(() => SmsProviderModule), // Avoid circular dependency if possible, manage at a higher level
  ],
  providers: [SmppService], // SmppBaseService is not directly provided as it's an abstract/base class
  exports: [SmppService, TypeOrmModule], // Export TypeOrmModule if other modules need these entities directly via SmppModule
})
export class SmppModule {}
