import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmsMessage } from '../../sms-message/entities/sms-message.entity';
import { User } from '../../user/entities/user.entity';
import { SmsTemplate } from '../../template/entities/sms-template.entity';

// 定义批次状态类型
export type BatchStatus =
  | 'pending'
  | 'processing'
  | 'partially_completed'
  | 'completed'
  | 'failed';

// 定义发送内容类型
export type ContentType = 'template' | 'direct';

// 将表名修改为与数据库表一致
@Entity('sms_notification_batches')
export class SmsNotificationBatch {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  // --- User who created this batch ---
  @Index()
  @Column({
    name: 'user_id',
    type: 'int',
    unsigned: true,
    comment: '发起请求的用户ID',
  })
  userId!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // 可选的，用户传入的请求ID，用于幂等性
  // @Index({ unique: true })
  // @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  // requestId?: string;

  // --- Batch Metadata ---
  @Column({ type: 'varchar', length: 255, comment: '批次名称/描述' })
  name!: string;

  @Index()
  @Column({
    name: 'status',
    type: 'varchar',
    default: 'pending',
  })
  status!: BatchStatus;

  // --- Template Content ---
  @Column({
    name: 'template_id',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: '使用的短信模板ID',
  })
  templateId?: number | null;

  @ManyToOne(() => SmsTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: SmsTemplate;

  @Column({
    name: 'template_params',
    type: 'json',
    nullable: true,
    comment: '模板参数 (替换变量)',
  })
  templateParams?: Record<string, any> | null;

  // --- Recipient Information ---
  // 修改为使用JSON类型存储接收者列表
  // @Column({
  //   type: 'text',
  //   nullable: false,
  //   comment: '用户请求的接收者号码列表',
  // })
  // recipients!: string[];

  // @Column({
  //   name: 'recipient_count',
  //   type: 'int',
  //   unsigned: true,
  //   nullable: false,
  //   comment: '请求中的接收者数量',
  // })
  // recipientCount!: number;

  // --- Timestamps ---
  // @Column({
  //   name: 'scheduled_at',
  //   type: 'datetime',
  //   nullable: true,
  //   comment: '预定发送时间',
  // })
  // scheduledAt?: Date | null;

  @Column({
    name: 'processing_started_at',
    type: 'datetime',
    nullable: true,
    comment: '开始处理时间',
  })
  processingStartedAt?: Date | null;

  // @Column({
  //   name: 'completed_at',
  //   type: 'datetime',
  //   nullable: true,
  //   comment: '批次完成处理时间',
  // })
  // completedAt?: Date | null;

  @CreateDateColumn({
    name: 'createTime',
    type: 'datetime',
    comment: '创建时间',
  })
  createTime!: Date;

  @UpdateDateColumn({
    name: 'updateTime',
    type: 'datetime',
    comment: '更新时间',
  })
  updateTime!: Date;

  // --- Relations ---
  // 修改关联关系名称与方向
  @OneToMany(() => SmsMessage, (message) => message.batch)
  messages!: SmsMessage[];

  // 添加内容类型字段
  @Column({
    name: 'content_type',
    type: 'varchar',
    default: 'template',
    comment: '内容类型：模板或直接内容',
    nullable: true,
  })
  contentType?: ContentType;

  // 直接内容字段
  @Column({
    name: 'direct_content',
    type: 'text',
    nullable: true,
    comment: '直接发送的内容（如果不使用模板）',
  })
  directContent?: string;

  // 添加处理计数字段
  @Column({
    name: 'processed_count',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: '已处理的消息数量',
  })
  processedCount?: number;

  @Column({
    name: 'success_count',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: '成功发送的消息数量',
  })
  successCount?: number;

  @Column({
    name: 'failure_count',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: '发送失败的消息数量',
  })
  failureCount?: number;

  @Column({
    name: 'processing_completed_at',
    type: 'datetime',
    nullable: true,
    comment: '处理完成时间',
  })
  processingCompletedAt?: Date | null;

  @Column({
    name: 'provider_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: '短信服务提供商ID',
  })
  providerId!: number;

  @Column({
    name: 'recipient_numbers',
    type: 'text',
    nullable: false,
    comment: '接收者手机号列表，以逗号分隔',
  })
  recipientNumbers!: string;

  @Column({
    name: 'total_recipients',
    type: 'int',
    nullable: false,
    default: 0,
    comment: '总接收者数量',
  })
  totalRecipients!: number;
}
