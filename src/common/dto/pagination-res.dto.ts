import { ApiProperty } from '@nestjs/swagger';

export class PaginationResDto<T> {
  @ApiProperty({ description: '数据列表' })
  list!: T[];

  @ApiProperty({ description: '总记录数', example: 100 })
  total!: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  pageNo!: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  pageSize!: number;

  constructor(list: T[], total: number, pageNo: number, pageSize: number) {
    this.list = list;
    this.total = total;
    this.pageNo = pageNo;
    this.pageSize = pageSize;
  }
}
