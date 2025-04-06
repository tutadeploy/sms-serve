import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity'; // Import User entity
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  // Foreign Key to User
  @Index() // Add index for foreign key
  @Column({ type: 'int', unsigned: true, comment: '创建模板的用户ID' })
  userId!: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE', // Match schema definition
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // Foreign Key to Tenant
  @Index()
  @Column({
    name: 'tenant_id',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: '关联的租户ID',
  })
  tenantId!: number | null;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant | null;

  @Column({ type: 'varchar', length: 150, comment: '模板名称' })
  name!: string;

  @Column({ type: 'varchar', length: 255, comment: '邮件主题模板' })
  subject!: string;

  @Column({ type: 'text', nullable: true, comment: 'HTML 格式邮件正文模板' })
  bodyHtml!: string | null;

  @Column({ type: 'text', nullable: true, comment: '纯文本格式邮件正文模板' })
  bodyText!: string | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: '模板中使用的变量列表 (e.g., ["link", "productName"])',
  })
  variables!: string[] | null; // Assuming array of strings based on comment

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
