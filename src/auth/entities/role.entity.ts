import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ unsigned: true })
  @ApiProperty({ description: '角色ID' })
  id!: number;

  @Column({ length: 100 })
  @ApiProperty({ description: '角色名称' })
  name!: string;

  @Column({ length: 100, unique: true })
  @ApiProperty({ description: '角色编码' })
  code!: string;

  @Column({ length: 255, nullable: true })
  @ApiProperty({ description: '角色描述', required: false })
  description?: string;

  @Column({ name: 'tenant_id', type: 'int', unsigned: true, nullable: true })
  @ApiProperty({ description: '租户ID', required: false })
  tenantId?: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
    },
  })
  permissions?: Permission[];

  @CreateDateColumn({ name: 'createTime' })
  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updateTime' })
  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;
}
