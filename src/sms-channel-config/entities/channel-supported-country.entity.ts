import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 渠道支持的国家实体
 * 存储各渠道支持的国家列表
 */
@Entity('channel_supported_countries')
@Index(['channel', 'countryCode'], { unique: true })
export class ChannelSupportedCountry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50 })
  channel!: string;

  @Column({ length: 10, name: 'country_code' })
  countryCode!: string;

  @Column({ length: 10, name: 'dial_code' })
  dialCode!: string;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'createTime' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'updateTime' })
  updateTime!: Date;
}
