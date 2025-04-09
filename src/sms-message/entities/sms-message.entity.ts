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
import { SmsNotificationBatch } from '../../sms-notification-batch/entities/sms-notification-batch.entity';
import { SmsProvider } from '../../sms-provider/entities/sms-provider.entity';

// 定义短信状态类型，保持与数据库表一致
export type SmsStatus =
  | 'pending'
  | 'queued'
  | 'submitted'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'rejected'
  | 'unknown'
  | 'sending';

@Entity('sms_messages')
export class SmsMessage {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '系统内部唯一消息ID',
  })
  id!: number;

  // --- Foreign Key to Batch ---
  @Index()
  @Column({
    name: 'batch_id',
    type: 'bigint',
    unsigned: true,
    comment: '关联的批次ID',
  })
  batchId!: number;

  @ManyToOne(() => SmsNotificationBatch, (batch) => batch.messages, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'batch_id' })
  batch!: SmsNotificationBatch;

  // --- Provider ---
  @Column({
    name: 'provider_id',
    type: 'int',
    unsigned: true,
    comment: '最终选择的短信服务商ID',
  })
  providerId!: number;

  @ManyToOne(() => SmsProvider, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'provider_id' })
  provider!: SmsProvider;

  // --- Message Details ---
  @Column({
    name: 'recipient_number',
    type: 'varchar',
    length: 50,
    comment: '接收者手机号',
  })
  recipientNumber!: string;

  @Index()
  @Column({
    name: 'status',
    type: 'varchar',
    default: 'pending',
  })
  status!: SmsStatus;

  @Index({ unique: true })
  @Column({
    name: 'provider_message_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '服务商返回的消息ID',
  })
  providerMessageId!: string | null;

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
    comment: '错误信息描述',
  })
  errorMessage!: string | null;

  @Column({
    name: 'sent_at',
    type: 'datetime',
    nullable: true,
    comment: '成功提交给服务商的时间',
  })
  sendTime!: Date | null;

  @Column({
    name: 'status_updated_at',
    type: 'datetime',
    nullable: true,
    comment: '服务商报告的发送/送达时间',
  })
  statusUpdateTime!: Date | null;

  // 注释掉 last_status_check_at 字段，因为新的数据库表中没有这个字段
  // @Column({
  //   name: 'last_status_check_at',
  //   type: 'datetime',
  //   nullable: true,
  //   comment: '最后一次主动查询状态的时间',
  // })
  // lastStatusCheckAt!: Date | null;

  @CreateDateColumn({
    name: 'createTime',
    type: 'datetime',
    comment: '记录创建时间',
  })
  createTime!: Date;

  @UpdateDateColumn({
    name: 'updateTime',
    type: 'datetime',
    comment: '记录更新时间',
  })
  updateTime!: Date;
}
