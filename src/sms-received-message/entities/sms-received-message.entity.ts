import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SmsProvider } from '../../sms-provider/entities/sms-provider.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('sms_received_messages')
export class SmsReceivedMessage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  // --- Foreign Key to Provider ---
  @Index() // Index is good practice for foreign keys
  @Column({ type: 'int', unsigned: true, comment: '接收消息的服务商ID' })
  smsProviderId!: number;

  @ManyToOne(() => SmsProvider, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'sms_provider_id' })
  smsProvider!: SmsProvider;

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

  // --- Message Details ---
  @Index({ unique: true }) // Added unique index based on schema
  @Column({
    name: 'provider_message_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
    comment: '服务商侧的消息唯一ID',
  })
  providerMessageId!: string | null;

  @Index() // Index based on schema
  @Column({ name: 'sender_number', type: 'varchar', length: 50 })
  senderNumber!: string;

  @Index() // Index based on schema
  @Column({ name: 'recipient_number', type: 'varchar', length: 50 })
  recipientNumber!: string;

  @Column({ type: 'text' })
  content!: string;

  @Index() // Index based on schema
  @Column({ name: 'received_at', type: 'datetime' })
  receivedAt!: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  // Note: No updated_at column in the schema for this table
}
