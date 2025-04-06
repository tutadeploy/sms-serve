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
import { User } from '../../user/entities/user.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('sms_templates')
export class SmsTemplate {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Index()
  @Column({
    name: 'user_id',
    type: 'int',
    unsigned: true,
    comment: '创建模板的用户ID',
  })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

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

  @Column({ type: 'varchar', length: 100, unique: true, comment: '模板名称' })
  name!: string;

  @Column({ type: 'text', comment: '模板内容' })
  content!: string;

  @Column({
    name: 'provider_template_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '服务商处的模板ID (如果需要在服务商预注册)',
  })
  providerTemplateId!: string | null;

  @Column({ type: 'text', nullable: true, comment: '模板变量列表' })
  variables!: string[] | null; // 假设存储为字符串数组 JSON

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
