import { Controller, Get } from '@nestjs/common';
import { DictDataService } from './dict-data.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('系统：字典数据管理')
@Controller('system/dict-data')
export class DictDataController {
  constructor(private readonly dictDataService: DictDataService) {}

  @Get('simple-list')
  @ApiOperation({ summary: '获取字典数据简化列表' })
  async getSimpleList() {
    return this.dictDataService.getSimpleList();
  }
}
