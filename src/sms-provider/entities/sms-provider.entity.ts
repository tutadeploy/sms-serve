import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sms_providers')
export class SmsProvider {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  // 唯一标识符，用于代码中引用服务商，如 'onbuka'
  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  name!: string;

  // 可选的显示名称，用于UI展示
  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  displayName?: string;

  @Column({ name: 'api_key', type: 'varchar', length: 255, nullable: true })
  apiKey!: string | null;

  @Column({ name: 'api_secret', type: 'varchar', length: 255, nullable: true })
  apiSecret!: string | null;

  @Column({ name: 'base_url', type: 'varchar', length: 255, nullable: true })
  baseUrl!: string | null;

  // 存储特定于提供商的配置，例如 Onbuka 的 appid
  @Column({ name: 'config_details', type: 'text', nullable: true })
  configDetails!: Record<string, any> | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
