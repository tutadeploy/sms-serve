import { Module } from '@nestjs/common';
import { NotifyMessageController } from './notify-message.controller';
import { NotifyMessageService } from './notify-message.service';

@Module({
  controllers: [NotifyMessageController],
  providers: [NotifyMessageService],
  exports: [NotifyMessageService],
})
export class NotifyMessageModule {}
