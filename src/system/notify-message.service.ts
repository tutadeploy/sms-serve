import { Injectable } from '@nestjs/common';

@Injectable()
export class NotifyMessageService {
  /**
   * 获取未读消息数量 (暂时返回固定值)
   */
  getUnreadCount(): { unreadCount: number } {
    return { unreadCount: 0 };
  }
}
