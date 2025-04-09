import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn({ unsigned: true })
  @ApiProperty({ description: '权限ID' })
  id!: number;

  @Column({ length: 100 })
  @ApiProperty({ description: '权限名称' })
  name!: string;

  @Column({ length: 100, unique: true })
  @ApiProperty({ description: '权限编码' })
  code!: string;

  @Column({ length: 255, nullable: true })
  @ApiProperty({ description: '权限描述', required: false })
  description?: string;

  @CreateDateColumn({ name: 'createTime' })
  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updateTime' })
  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;
}
