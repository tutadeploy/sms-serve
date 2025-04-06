import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { Account } from '../../account/entities/account.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users') // Maps to the 'users' table
export class User {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  @IsNotEmpty({ message: '用户名不能为空' })
  username!: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: false,
    select: false,
  }) // select: false prevents password hash from being selected by default
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email!: string;

  @Column({
    type: 'varchar',
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  role!: UserRole;

  // 虚拟属性，不存储在数据库中，用于JWT令牌
  get roles(): string[] {
    return [this.role];
  }

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isActive!: boolean;

  @Column({ name: 'tenant_id', type: 'int', unsigned: true, nullable: true })
  tenantId: number | null = null;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null = null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  // --- Relations ---
  @OneToMany(() => Account, (account) => account.user)
  accounts!: Account[];

  // --- Password Handling ---

  // Temporary property for password during creation/update
  // Not stored in the database
  @MinLength(6, { message: '密码长度至少为6位' })
  password?: string;

  @BeforeInsert()
  @BeforeUpdate()
  hashPassword() {
    console.log('hashPassword hook triggered, password:', !!this.password);

    // 只有在提供了明文密码的情况下才进行哈希
    if (this.password) {
      try {
        const saltRounds = 10;
        // 使用同步方法以确保在任何情况下都能完成哈希
        this.passwordHash = bcrypt.hashSync(this.password, saltRounds);
        console.log('Password hashed successfully, passwordHash is now set.');
        // 清除临时密码字段
        this.password = undefined;
      } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Failed to hash password');
      }
    } else {
      console.log('No password provided for hashing');
      // 如果是更新操作，不提供密码是正常的
      // 如果是插入操作且passwordHash为空字符串，则可能是问题
      if (
        this.id === undefined &&
        (!this.passwordHash || this.passwordHash === '')
      ) {
        console.warn('Creating user without password');
      }
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    return bcrypt.compare(password, this.passwordHash);
  }
}
