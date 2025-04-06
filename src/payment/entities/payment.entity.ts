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
import { User } from '../../user/entities/user.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number; // TypeORM 使用 number 表示 bigint

  @Index()
  @Column({ type: 'int', unsigned: true, comment: '关联的用户ID' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '支付金额' })
  amount!: number;

  @Index()
  @Column({
    name: 'status',
    type: 'varchar',
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Index()
  @Column({
    name: 'transaction_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
    comment: '支付网关返回的交易ID',
  })
  transactionId!: string | null;

  @Column({
    name: 'payment_method',
    type: 'varchar',
  })
  paymentMethod!: string | null;

  @CreateDateColumn({ type: 'datetime', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', comment: '更新时间' })
  updatedAt!: Date;
}
