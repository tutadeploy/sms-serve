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
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { Account } from '../../account/entities/account.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Role } from '../../auth/entities/role.entity';

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

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @Column({
    type: 'varchar',
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  role!: UserRole;

  @Column({ name: 'nickname', type: 'varchar', length: 100, nullable: true })
  nickname?: string;

  @Column({ name: 'mobile', type: 'varchar', length: 20, nullable: true })
  mobile?: string;

  @Column({ name: 'sex', type: 'tinyint', default: 0 })
  sex?: number;

  @Column({ name: 'avatar', type: 'varchar', length: 255, nullable: true })
  avatar?: string;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status?: number;

  @Column({ name: 'remark', type: 'varchar', length: 500, nullable: true })
  remark?: string;

  @Column({ name: 'login_ip', type: 'varchar', length: 50, nullable: true })
  loginIp?: string;

  @Column({ name: 'login_date', type: 'datetime', nullable: true })
  loginDate?: Date;

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

  @CreateDateColumn({ name: 'createTime', type: 'datetime' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'updateTime', type: 'datetime' })
  updateTime!: Date;

  @Column({
    name: 'package_form_code',
    type: 'varchar',
    length: 8,
    nullable: true,
    unique: true,
  })
  packageFormCode?: string;

  // --- Relations ---
  @OneToMany(() => Account, (account) => account.user)
  accounts!: Account[];

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'user_roles',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles?: Role[];

  // --- Password Handling ---

  // Temporary property for password during creation/update
  // Not stored in the database
  @MinLength(6, { message: '密码长度至少为6位' })
  password?: string;

  @BeforeInsert()
  @BeforeUpdate()
  hashPassword() {
    // 只有在提供了明文密码的情况下才进行哈希
    if (this.password) {
      try {
        const saltRounds = 10;
        // 使用同步方法以确保在任何情况下都能完成哈希
        this.passwordHash = bcrypt.hashSync(this.password, saltRounds);
        // 清除临时密码字段
        this.password = undefined;
      } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Failed to hash password');
      }
    } else {
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
