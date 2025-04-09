import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsBatch } from './entities/sms-batch.entity';
import { SmsBatchBukaDetail } from './entities/sms-batch-buka-detail.entity';
import { SmsBatchService } from './sms-batch.service';
import { SmsBatchController } from './sms-batch.controller';
import { BukaModule } from '../sms-provider/buka/buka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmsBatch, SmsBatchBukaDetail]),
    BukaModule,
  ],
  controllers: [SmsBatchController],
  providers: [SmsBatchService],
  exports: [SmsBatchService],
})
export class SmsBatchModule {}
