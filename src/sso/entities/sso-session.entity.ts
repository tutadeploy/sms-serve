import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('sso_sessions')
export class SsoSession {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  @ApiProperty({ description: '会话ID' })
  id!: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  @ApiProperty({ description: '关联用户ID' })
  userId!: number;

  @Column({ name: 'tenant_id', type: 'int', unsigned: true, nullable: true })
  @ApiProperty({ description: '关联租户ID', required: false })
  tenantId: number | null = null;

  @Column({ name: 'session_id', type: 'varchar', length: 100, unique: true })
  @ApiProperty({ description: '会话唯一标识' })
  sessionId!: string;

  @Column({ name: 'token_id', type: 'bigint', unsigned: true })
  @ApiProperty({ description: '关联的令牌ID' })
  tokenId!: number;

  @Column({
    name: 'login_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @ApiProperty({ description: '登录时间' })
  loginAt!: Date;

  @Column({
    name: 'last_activity_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  @ApiProperty({ description: '最后活动时间' })
  lastActivityAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  @ApiProperty({ description: '会话过期时间' })
  expiresAt!: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @ApiProperty({ description: '会话是否活跃', default: true })
  isActive!: boolean;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  @ApiProperty({ description: 'IP地址', required: false })
  ipAddress: string | null = null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  @ApiProperty({ description: '用户代理信息', required: false })
  userAgent: string | null = null;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;

  // 关联
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null = null;
}
