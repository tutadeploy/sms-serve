import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';

/**
 * 短信服务提供商基础配置实体（系统级）
 * 存储服务商的基础信息，如名称、显示名称、基础URL等
 */
@Entity('sms_providers')
export class SmsProvider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'display_name', nullable: true })
  displayName: string;

  @Column({ name: 'base_url', nullable: false })
  baseUrl: string;

  @Column({ name: 'config_details', type: 'json', nullable: true })
  configDetails: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    name: 'createTime',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createTime: Date;

  @Column({
    name: 'updateTime',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updateTime: Date;
}
