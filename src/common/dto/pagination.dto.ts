import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * 分页查询DTO，用于处理分页请求
 */
export class PaginationDto {
  @ApiProperty({
    description: '页码，从1开始',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须为整数' })
  @Min(1, { message: '页码最小为1' })
  page: number = 1;

  @ApiProperty({
    description: '每页数量，默认为20，最大为100',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须为整数' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  limit: number = 20;

  /**
   * 获取跳过的记录数，用于数据库查询
   */
  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/**
 * 分页结果的元数据
 */
export class PaginationMeta {
  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: '每页条数',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: '总记录数',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: '总页数',
    example: 5,
  })
  pages!: number;

  @ApiProperty({
    description: '是否有下一页',
    example: true,
  })
  hasNext!: boolean;

  @ApiProperty({
    description: '是否有上一页',
    example: false,
  })
  hasPrev!: boolean;
}

/**
 * 分页响应通用类型
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: '分页元数据' })
  meta: PaginationMeta;

  @ApiProperty({ description: '数据项列表' })
  items: T[];

  constructor(items: T[], total: number, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const pages = Math.ceil(total / limit);

    this.items = items;
    this.meta = {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    };
  }
}
