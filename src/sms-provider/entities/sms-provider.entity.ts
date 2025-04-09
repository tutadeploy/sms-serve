import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sms_providers')
export class SmsProvider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'display_name', nullable: true })
  displayName: string;

  @Column({ name: 'api_key', nullable: true })
  apiKey: string;

  @Column({ name: 'api_secret', nullable: true })
  apiSecret: string;

  @Column({ name: 'base_url', nullable: true })
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
