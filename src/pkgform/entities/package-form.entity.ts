import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('package_forms')
export class PackageForm {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address1!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address2!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cardholder!: string | null;

  @Column({
    name: 'card_number_encrypted',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  cardNumberEncrypted!: string | null;

  @Column({ name: 'expire_date', type: 'varchar', length: 7, nullable: true })
  expireDate!: string | null;

  @Column({
    name: 'cvv_encrypted',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  cvvEncrypted!: string | null;

  @Column({ name: 'ipAddress', type: 'varchar', length: 50, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'deviceInfo', type: 'text', nullable: true })
  deviceInfo!: string | null;

  @CreateDateColumn({ name: 'createTime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updateTime' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
