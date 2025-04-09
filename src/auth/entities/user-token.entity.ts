import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { SsoSession } from '../../sso/entities/sso-session.entity';

@Entity('user_tokens')
export class UserToken {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  @ApiProperty({ description: '令牌ID' })
  id!: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  @ApiProperty({ description: '用户ID' })
  userId!: number;

  @Column({ name: 'access_token', type: 'varchar', length: 2048 })
  @ApiProperty({ description: '访问令牌' })
  accessToken!: string;

  @Column({ name: 'refresh_token', type: 'varchar', length: 255 })
  @ApiProperty({ description: '刷新令牌' })
  refreshToken!: string;

  @Column({ name: 'client_id', type: 'varchar', length: 100 })
  @ApiProperty({ description: '客户端标识', example: 'web' })
  clientId!: string;

  @Column({ name: 'user_type', type: 'tinyint', unsigned: true, default: 1 })
  @ApiProperty({ description: '用户类型', default: 1 })
  userType: number = 1;

  @Column({ name: 'tenant_id', type: 'int', unsigned: true, nullable: true })
  @ApiProperty({ description: '租户ID', required: false })
  tenantId: number | null = null;

  @Column({ name: 'device_info', type: 'json', nullable: true })
  @ApiProperty({ description: '设备信息', required: false })
  deviceInfo: Record<string, any> | null = null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  @ApiProperty({ description: 'IP地址', required: false })
  ipAddress: string | null = null;

  @Column({ name: 'access_token_expires_at', type: 'timestamp' })
  @ApiProperty({ description: '访问令牌过期时间' })
  accessTokenExpiresAt!: Date;

  @Column({ name: 'refresh_token_expires_at', type: 'timestamp' })
  @ApiProperty({ description: '刷新令牌过期时间' })
  refreshTokenExpiresAt!: Date;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  @ApiProperty({ description: '是否已撤销', default: false })
  isRevoked: boolean = false;

  @CreateDateColumn({ name: 'createTime' })
  @ApiProperty({ description: '创建时间' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'updateTime' })
  @ApiProperty({ description: '更新时间' })
  updateTime!: Date;

  // 关联
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null = null;

  @OneToMany(() => SsoSession, (session) => session.tokenId)
  sessions?: SsoSession[];

  /**
   * 检查访问令牌是否过期
   */
  isAccessTokenExpired(): boolean {
    const now = new Date();
    return now > this.accessTokenExpiresAt;
  }

  /**
   * 检查刷新令牌是否过期
   */
  isRefreshTokenExpired(): boolean {
    const now = new Date();
    return now > this.refreshTokenExpiresAt;
  }

  /**
   * 检查访问令牌是否有效
   */
  isValid(): boolean {
    return !this.isRevoked && !this.isAccessTokenExpired();
  }

  /**
   * 检查刷新令牌是否有效
   */
  isRefreshValid(): boolean {
    return !this.isRevoked && !this.isRefreshTokenExpired();
  }
}
