import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { EmailTemplate } from '../../email-template/entities/email-template.entity';
import { EmailMessage } from '../../email-message/entities/email-message.entity';

// Reuse or define a similar status enum if needed, or use a generic one
// For now, using the same enum name as SMS for simplicity, but consider renaming
export enum EmailBatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PARTIALLY_COMPLETED = 'partially_completed',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('email_notification_batches')
export class EmailNotificationBatch {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  // --- Foreign Keys ---
  @Index()
  @Column({ type: 'int', unsigned: true, comment: '发起推送的用户ID' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: '使用的邮件模板ID',
  })
  emailTemplateId!: number | null;

  @ManyToOne(() => EmailTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'email_template_id' })
  emailTemplate!: EmailTemplate | null;

  // Note: email_provider_id is commented out in schema, so not included here yet.

  // --- Batch Details ---
  @Column({ type: 'varchar', length: 255, nullable: true, comment: '邮件主题' })
  subject!: string | null;

  @Column({ type: 'text', nullable: true, comment: 'HTML邮件正文' })
  bodyHtml!: string | null;

  @Column({ type: 'text', nullable: true, comment: '纯文本邮件正文' })
  bodyText!: string | null;

  @Column({ type: 'int', unsigned: true, comment: '总接收邮箱数量' })
  totalRecipients!: number;

  @Column({ type: 'int', unsigned: true, default: 0, comment: '已处理数量' })
  processedCount!: number;

  @Column({ type: 'int', unsigned: true, default: 0, comment: '成功发送数量' })
  sentCount!: number;

  @Column({ type: 'int', unsigned: true, default: 0, comment: '发送失败数量' })
  failedCount!: number;

  @Index()
  @Column({
    type: 'varchar',
    default: EmailBatchStatus.PENDING,
    comment: '批次状态',
  })
  status!: EmailBatchStatus;

  @Column({ type: 'datetime', nullable: true, comment: '预定发送时间' })
  scheduledAt!: Date | null;

  @Column({ type: 'datetime', nullable: true, comment: '批次完成处理时间' })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', comment: '更新时间' })
  updatedAt!: Date;

  // --- Relations (OneToMany) ---
  @OneToMany(() => EmailMessage, (emailMessage) => emailMessage.batch)
  emailMessages!: EmailMessage[];
}
