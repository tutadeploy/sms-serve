import { ApiProperty } from '@nestjs/swagger';

export class DictDataDTO {
  @ApiProperty({ description: '字典类型' })
  dictType!: string;

  @ApiProperty({ description: '字典键值' })
  value!: string;

  @ApiProperty({ description: '字典标签' })
  label!: string;

  @ApiProperty({ description: '颜色类型' })
  colorType!: string;

  @ApiProperty({ description: 'CSS样式' })
  cssClass!: string;

  constructor(partial: Partial<DictDataDTO>) {
    Object.assign(this, partial);
  }
}
