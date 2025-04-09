import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_channel_configs')
export class UserChannelConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column()
  channel: string;

  @Column({ type: 'json' })
  config: Record<string, any>;

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
