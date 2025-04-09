import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { SmsBatchBukaDetail } from './sms-batch-buka-detail.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 短信批次实体
 * 存储批次的基本信息，适用于所有渠道
 */
@Entity('sms_batch')
export class SmsBatch {
  @ApiProperty({
    description: '批次ID',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: '租户ID',
    example: 1,
  })
  @Column()
  tenantId: number;

  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  @Column()
  userId: number;

  @ApiProperty({
    description: '渠道类型',
    example: 'onbuka',
  })
  @Column()
  channel: string;

  @ApiProperty({
    description: '创建时间',
    example: '2025-04-09T12:08:46.000Z',
  })
  @Column({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: '批次状态',
    example: 'completed',
    enum: ['pending', 'submitted', 'completed', 'failed'],
  })
  @Column()
  status: string;

  @ApiProperty({
    description: '失败原因（如果有）',
    example: '部分号码无效',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  reason: string;

  @ApiProperty({
    description: '总接收者数量',
    example: 10,
  })
  @Column({ name: 'total_count', default: 0 })
  totalCount: number;

  @ApiProperty({
    description: '发送成功数量',
    example: 8,
  })
  @Column({ name: 'success_count', default: 0 })
  successCount: number;

  @ApiProperty({
    description: '发送失败数量',
    example: 2,
  })
  @Column({ name: 'failed_count', default: 0 })
  failedCount: number;

  @ApiProperty({
    description: '短信内容',
    example: '您的验证码是：123456，请在5分钟内使用。',
  })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({
    description: '创建时间',
    example: '2025-04-09T12:08:46.000Z',
  })
  @CreateDateColumn({ name: 'createTime' })
  createTime: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2025-04-09T12:08:47.000Z',
  })
  @UpdateDateColumn({ name: 'updateTime' })
  updateTime: Date;

  // 关联
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @OneToMany(() => SmsBatchBukaDetail, (bukaDetail) => bukaDetail.batch)
  bukaDetails: SmsBatchBukaDetail[];
}
