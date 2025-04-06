import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  @IsNotEmpty({ message: '用户名不能为空' })
  username!: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email!: string;

  @Column({
    type: 'varchar',
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  role!: UserRole;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  // 临时密码字段，不存储到数据库
  @MinLength(6, { message: '密码长度至少为6位' })
  password?: string;

  // 确认密码字段，不存储到数据库
  confirmPassword?: string;

  @BeforeInsert()
  @BeforeUpdate()
  hashPassword() {
    if (this.password) {
      const saltRounds = 10;
      this.passwordHash = bcrypt.hashSync(this.password, saltRounds);
      this.password = undefined;
      this.confirmPassword = undefined;
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    return bcrypt.compare(password, this.passwordHash);
  }
}
