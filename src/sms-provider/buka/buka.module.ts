import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { BukaService } from './buka.service';
import { TenantChannelConfig } from '../../sms-channel-config/entities/tenant-channel-config.entity';
import { UserChannelConfig } from '../../sms-channel-config/entities/user-channel-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantChannelConfig, UserChannelConfig]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    CacheModule.register({
      ttl: 300, // 5 minutes
    }),
  ],
  providers: [BukaService],
  exports: [BukaService, TypeOrmModule],
})
export class BukaModule {}
