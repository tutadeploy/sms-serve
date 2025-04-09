import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryFormDto {
  @ApiProperty({ description: '创建开始时间', required: false })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.createTime !== '')
  @IsDateString()
  createTime?: string;

  @ApiProperty({ description: '创建结束时间', required: false })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.endCreateTime !== '')
  @IsDateString()
  endCreateTime?: string;

  @ApiProperty({ description: '更新开始时间', required: false })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.updateTime !== '')
  @IsDateString()
  updateTime?: string;

  @ApiProperty({ description: '更新结束时间', required: false })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.endUpdateTime !== '')
  @IsDateString()
  endUpdateTime?: string;

  @ApiProperty({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageNo?: number;

  @ApiProperty({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;

  @ApiProperty({
    description: '排序方式',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false,
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort?: 'ASC' | 'DESC' = 'DESC';
}
