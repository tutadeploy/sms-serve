import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmailNotificationBatch } from '../../email-notification-batch/entities/email-notification-batch.entity';

// 新增 EmailStatus 类型定义
export type EmailStatus =
  | 'queued'
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered' // 可能需要通过 webhook 确认
  | 'bounced' // 硬退回或软退回
  | 'failed'
  | 'rejected'; // 例如被服务商拒绝

@Entity('email_messages')
export class EmailMessage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  // --- Foreign Key to Batch ---
  @Index()
  @Column({ type: 'bigint', unsigned: true, comment: '所属推送批次ID' })
  batchId!: number;

  @ManyToOne(() => EmailNotificationBatch, (batch) => batch.emailMessages, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'batch_id' })
  batch!: EmailNotificationBatch;

  // --- Message Details ---
  @Column({ type: 'varchar', length: 255, comment: '接收者邮箱地址' })
  recipientEmail!: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
    comment:
      '发送状态 (e.g., queued, pending, sending, sent, delivered, bounced, failed, rejected)',
  })
  status!: EmailStatus;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
    comment: '服务商返回的消息ID',
  })
  providerMessageId!: string | null;

  @Column({ type: 'text', nullable: true, comment: '错误信息描述' })
  errorMessage!: string | null;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt?: Date;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'status_updated_at', type: 'datetime', nullable: true })
  statusUpdatedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
