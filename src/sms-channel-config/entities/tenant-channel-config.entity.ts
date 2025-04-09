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
import { Tenant } from '../../tenant/entities/tenant.entity';

/**
 * 租户渠道认证配置实体（租户特定）
 * 存储租户对应各渠道的API密钥等认证信息
 */
@Entity('tenant_channel_configs')
@Index(['tenantId', 'channel'], { unique: true })
export class TenantChannelConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'tenant_id' })
  tenantId!: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ length: 50 })
  channel!: string;

  @Column({ length: 255, nullable: false })
  apiKey!: string;

  @Column({ length: 255, nullable: false })
  apiSecret!: string;

  @Column({ type: 'json', nullable: true, name: 'config_details' })
  configDetails!: Record<string, unknown>;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'createTime' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'updateTime' })
  updateTime!: Date;
}
