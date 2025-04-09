import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SmsBatch } from './sms-batch.entity';

/**
 * Buka批次详情实体
 * 存储每个批次中的Buka渠道相关消息详情
 */
@Entity('sms_batch_buka_detail')
export class SmsBatchBukaDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'batch_id' })
  batchId: number;

  @Column({ name: 'message_id' })
  messageId: number;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'provider_message_id', nullable: true })
  providerMessageId: string;

  @Column({ name: 'recipient_number' })
  recipientNumber: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @CreateDateColumn({ name: 'createTime' })
  createTime: Date;

  @UpdateDateColumn({ name: 'updateTime' })
  updateTime: Date;

  // 关联
  @ManyToOne(() => SmsBatch, (batch) => batch.bukaDetails)
  @JoinColumn({ name: 'batch_id' })
  batch: SmsBatch;
}
