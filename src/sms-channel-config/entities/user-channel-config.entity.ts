import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';

/**
 * 用户渠道配置实体
 * 存储用户对应各渠道的特定配置信息(如Buka的appId)
 */
@Entity('user_channel_configs')
@Index(['userId', 'channel'], { unique: true })
export class UserChannelConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'tenant_id' })
  tenantId!: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ length: 50 })
  channel!: string;

  @Column({ type: 'json', nullable: true, name: 'config_details' })
  configDetails!: Record<string, unknown>;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'createTime' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'updateTime' })
  updateTime!: Date;
}
