import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DictDataEntity } from './entities/dict-data.entity';
import { DictDataDTO } from './dto/dict-data.dto';

@Injectable()
export class DictDataService {
  constructor(
    @InjectRepository(DictDataEntity)
    private dictDataRepository: Repository<DictDataEntity>,
  ) {}

  /**
   * 获取简化字典数据列表
   */
  async getSimpleList(): Promise<DictDataDTO[]> {
    const dictDataList = await this.dictDataRepository.find({
      where: { status: 0 },
      select: ['dictType', 'value', 'label', 'colorType', 'cssClass'],
      order: {
        dictType: 'ASC',
        sort: 'ASC',
      },
    });

    return dictDataList.map(
      (item) =>
        new DictDataDTO({
          dictType: item.dictType,
          value: item.value,
          label: item.label,
          colorType: item.colorType || '',
          cssClass: item.cssClass || '',
        }),
    );
  }
}
