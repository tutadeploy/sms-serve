import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sys_dict_data')
export class DictDataEntity {
  @ApiProperty({ description: '字典编码' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ description: '字典排序' })
  @Column({ name: 'dict_sort', default: 0 })
  sort!: number;

  @ApiProperty({ description: '字典标签' })
  @Column({ name: 'dict_label', length: 100 })
  label!: string;

  @ApiProperty({ description: '字典键值' })
  @Column({ name: 'dict_value', length: 100 })
  value!: string;

  @ApiProperty({ description: '字典类型' })
  @Column({ name: 'dict_type', length: 100 })
  dictType!: string;

  @ApiProperty({ description: '状态（0正常 1停用）' })
  @Column({ default: 0 })
  status!: number;

  @ApiProperty({ description: '颜色类型' })
  @Column({ name: 'color_type', length: 100, nullable: true })
  colorType!: string;

  @ApiProperty({ description: 'CSS样式' })
  @Column({ name: 'css_class', length: 100, nullable: true })
  cssClass!: string;

  @ApiProperty({ description: '备注' })
  @Column({ length: 500, nullable: true })
  remark!: string;

  @ApiProperty({ description: '创建时间' })
  @Column({
    name: 'create_time',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createTime!: Date;

  @ApiProperty({ description: '更新时间' })
  @Column({ name: 'update_time', type: 'timestamp', nullable: true })
  updateTime!: Date;

  constructor(partial: Partial<DictDataEntity>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
