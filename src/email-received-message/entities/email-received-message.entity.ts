import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';

export enum ReceivedEmailType {
  INBOUND = 'inbound',
  BOUNCE = 'bounce',
  REPLY = 'reply',
  COMPLAINT = 'complaint',
}

// 定义消息状态类型
export type MessageStatus = 'unprocessed' | 'processed' | 'failed';

@Entity('email_received_messages')
export class EmailReceivedMessage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  // --- Foreign Key to Tenant ---
  @Index()
  @Column({
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: '关联的租户ID',
  })
  tenantId!: number | null;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant | null;

  // Note: email_provider_id is commented out in schema, so not included yet.

  @Index({ unique: true }) // Added unique index based on schema
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
    comment: '邮件的 Message-ID header',
  })
  messageIdHeader!: string | null;

  @Index() // Index based on schema
  @Column({
    name: 'in_reply_to_header',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '邮件的 In-Reply-To header',
  })
  inReplyToHeader!: string | null;

  @Index() // Index based on schema
  @Column({ type: 'varchar', length: 255, comment: '发送者邮箱' })
  senderEmail!: string;

  @Index() // Index based on schema
  @Column({ type: 'varchar', length: 255, comment: '接收者邮箱 (本平台邮箱)' })
  recipientEmail!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '邮件主题' })
  subject!: string | null;

  @Column({ type: 'text', nullable: true, comment: 'HTML 正文' })
  bodyHtml!: string | null;

  @Column({ type: 'text', nullable: true, comment: '纯文本正文' })
  bodyText!: string | null;

  @Index() // Index based on schema
  @Column({ type: 'datetime', comment: '接收时间' })
  receivedAt!: Date;

  @Index() // Index based on schema
  @Column({
    type: 'varchar',
    default: ReceivedEmailType.INBOUND,
    comment: '邮件类型',
  })
  type!: ReceivedEmailType;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @Column({
    name: 'status',
    type: 'varchar',
    default: 'unprocessed',
  })
  status!: MessageStatus;

  // Note: No updated_at column in the schema for this table
}
