export interface EmailSendJobData {
  batchId: number;
  messageId: number;
  recipient: string;
  subject: string; // 主题也需要传递
  bodyHtml?: string | null; // HTML 正文 (可选)
  bodyText?: string | null; // 纯文本正文 (可选)
  // 注意：这里不直接传递 EmailProvider，因为邮件发送通常更复杂，
  // 可能涉及账户、凭证、API密钥等，这些最好在 NotificationService 内部处理或配置。
  // NotificationService 会根据配置选择合适的邮件发送方式。
}
