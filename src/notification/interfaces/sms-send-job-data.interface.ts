export interface SmsSendJobData {
  batchId: number;
  messageId: number;
  provider: number; // 服务商ID
  recipient: string;
  content: string;
}
