import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { SmsDispatchBatch } from './sms-dispatch-batch.entity'; // 关联新的批次实体
import { SmsProvider } from '../../sms-provider/entities/sms-provider.entity';

// 定义标准化的短信状态枚举
export enum SmsMessageStatus {
  PENDING = 'pending', // 待处理 (已创建，等待调度)
  QUEUED = 'queued', // 已排队 (Dispatcher 已处理，等待 Provider 发送)
  SUBMITTED = 'submitted', // 已提交 (已成功发送给服务商 API)
  SENT = 'sent', // 已发送 (服务商确认已发出，但未确认送达)
  DELIVERED = 'delivered', // 已送达 (服务商确认已送达终端)
  FAILED = 'failed', // 发送失败 (服务商报告发送失败)
  REJECTED = 'rejected', // 已拒绝 (例如，因内容、黑名单等原因被服务商拒绝)
  UNKNOWN = 'unknown', // 未知状态 (查询时无法获取确切状态)
}

@Entity('sms_messages')
@Unique('uk_sm_provider_msgid', ['provider', 'providerMsgid']) // 使用正确的属性名
export class SmsMessage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Index()
  @Column({
    name: 'dispatch_batch_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  dispatchBatchId!: number;

  @ManyToOne(() => SmsDispatchBatch, (batch) => batch.messages, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'dispatch_batch_id' })
  dispatchBatch!: SmsDispatchBatch;

  @Column({
    name: 'recipient_number',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  recipientNumber!: string;

  // 关联到服务商
  @Index()
  @Column({ name: 'provider_id', type: 'int', unsigned: true, nullable: false })
  providerId!: number;

  @ManyToOne(() => SmsProvider, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'provider_id' })
  provider!: SmsProvider;

  @Index()
  @Column({
    name: 'provider_msgid',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerMsgid?: string;

  @Column({
    name: 'provider_orderid',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerOrderid?: string;

  @Index()
  @Column({
    name: 'status',
    type: 'varchar',
    default: SmsMessageStatus.PENDING,
  })
  status!: SmsMessageStatus;

  @Column({
    name: 'provider_status_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  providerStatusCode?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'submitted_at', type: 'datetime', nullable: true })
  submittedAt?: Date;

  @Column({ name: 'provider_reported_at', type: 'datetime', nullable: true })
  providerReportedAt?: Date;

  @Column({ name: 'last_status_check_at', type: 'datetime', nullable: true })
  lastStatusCheckAt?: Date;

  @UpdateDateColumn({ name: 'updateTime', type: 'datetime' })
  updatedAt!: Date;

  @CreateDateColumn({ name: 'createTime', type: 'datetime' })
  createTime!: Date;
}
