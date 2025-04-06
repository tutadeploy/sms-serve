import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotifyMessageService } from './notify-message.service';

@ApiTags('系统：站内信通知')
@Controller('system/notify-message')
export class NotifyMessageController {
  constructor(private readonly notifyMessageService: NotifyMessageService) {}

  @Get('get-unread-count')
  @ApiOperation({ summary: '获取当前用户的未读消息数量' })
  getUnreadCount() {
    // 直接调用服务层方法，它会返回 { unreadCount: 0 }
    return this.notifyMessageService.getUnreadCount();
  }
}
