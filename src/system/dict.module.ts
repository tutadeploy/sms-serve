import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictDataController } from './dict-data.controller';
import { DictDataService } from './dict-data.service';
import { DictDataEntity } from './entities/dict-data.entity';
import { NotifyMessageModule } from './notify-message.module';
import { NotifyMessageController } from './notify-message.controller';
import { NotifyMessageService } from './notify-message.service';

@Module({
  imports: [TypeOrmModule.forFeature([DictDataEntity]), NotifyMessageModule],
  controllers: [DictDataController, NotifyMessageController],
  providers: [DictDataService, NotifyMessageService],
  exports: [DictDataService],
})
export class DictModule {}
