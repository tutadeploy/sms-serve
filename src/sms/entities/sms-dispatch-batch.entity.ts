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
import { SmsTemplate } from '../../template/entities/sms-template.entity';
import { SmsMessage } from './sms-message.entity'; // 导入新的 SmsMessage 实体

export enum SmsDispatchBatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PARTIALLY_COMPLETED = 'partially_completed',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('sms_dispatch_batches')
export class SmsDispatchBatch {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Index()
  @Column({ name: 'user_id', type: 'int', unsigned: true, nullable: false })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // 可选的，用户传入的请求ID，用于幂等性
  @Index({ unique: true })
  @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  requestId?: string;

  @Column({ name: 'template_id', type: 'int', unsigned: true, nullable: true })
  templateId?: number;

  @ManyToOne(() => SmsTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: SmsTemplate;

  // 最终要发送的短信内容
  @Column({ type: 'text', nullable: false })
  content!: string;

  // 原始请求的接收者列表 (JSON 数组)
  @Column({ type: 'text', nullable: false })
  recipients!: string[];

  @Column({
    name: 'recipient_count',
    type: 'int',
    unsigned: true,
    nullable: false,
  })
  recipientCount!: number;

  @Index()
  @Column({
    name: 'status',
    type: 'varchar',
    default: SmsDispatchBatchStatus.PENDING,
  })
  status!: SmsDispatchBatchStatus;

  @Column({ name: 'scheduled_at', type: 'datetime', nullable: true })
  scheduledAt?: Date;

  @Column({ name: 'processing_started_at', type: 'datetime', nullable: true })
  processingStartedAt?: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'createTime', type: 'datetime' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'updateTime', type: 'datetime' })
  updateTime!: Date;

  // --- 关系 ---
  @OneToMany(() => SmsMessage, (message) => message.dispatchBatch)
  messages!: SmsMessage[];
}
