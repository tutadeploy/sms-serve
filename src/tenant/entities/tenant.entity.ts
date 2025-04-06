import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn({ unsigned: true })
  @ApiProperty({ description: '租户ID' })
  id!: number;

  @Column({ length: 100, unique: true })
  @ApiProperty({ description: '租户名称' })
  name!: string;

  @Column({ length: 50, unique: true })
  @ApiProperty({ description: '租户唯一编码' })
  code!: string;

  @Column({ length: 255, nullable: true })
  @ApiProperty({ description: '租户网站地址', required: false })
  website!: string;

  @Column({ length: 255, nullable: true })
  @ApiProperty({ description: '联系邮箱', required: false })
  contactEmail!: string;

  @Column({ length: 50, nullable: true })
  @ApiProperty({ description: '联系电话', required: false })
  contactPhone!: string;

  @Column({ length: 255, nullable: true })
  @ApiProperty({ description: 'Logo URL', required: false })
  logoUrl!: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  @ApiProperty({
    description: '租户状态',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status!: TenantStatus;

  @Column({ type: 'date', nullable: true })
  @ApiProperty({ description: '过期日期', required: false })
  expirationDate!: Date;

  @CreateDateColumn()
  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users!: User[];
}
