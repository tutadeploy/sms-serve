import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity'; // 导入 User 实体

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  // 外键列，直接映射数据库中的 user_id
  @Index()
  @Column({
    type: 'int',
    unsigned: true,
    unique: true,
    nullable: false,
    name: 'user_id',
    comment: '用户ID',
  })
  userId!: number;

  // 定义与 User 的一对一关系
  // () => User: 指定关系的目标实体
  // user => user.account: 指定反向关系（如果需要在 User 实体中访问 Account）
  // { cascade: true, onDelete: 'CASCADE' }: 可选的级联操作和删除规则，这里与 schema.sql 的 ON DELETE CASCADE 保持一致
  @ManyToOne(() => User, (user) => user.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // 指定外键列的名称
  user!: User;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    default: 0.0,
    nullable: false,
    comment: '账户余额',
  })
  balance!: number; // TypeORM 通常将 decimal 映射为 number 或 string，这里用 number

  @CreateDateColumn({
    name: 'createTime',
    type: 'datetime',
  })
  createTime!: Date;

  @UpdateDateColumn({
    name: 'updateTime',
    type: 'datetime',
  })
  updateTime!: Date;
}
