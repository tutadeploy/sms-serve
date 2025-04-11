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
  @ApiProperty({ description: '创建时间开始日期', required: false })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.createTimeStart !== '')
  @IsDateString()
  createTimeStart?: string;

  @ApiProperty({ description: '创建时间结束日期', required: false })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.createTimeEnd !== '')
  @IsDateString()
  createTimeEnd?: string;

  @ApiProperty({ description: '更新时间开始日期', required: false })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.updateTimeStart !== '')
  @IsDateString()
  updateTimeStart?: string;

  @ApiProperty({ description: '更新时间结束日期', required: false })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.updateTimeEnd !== '')
  @IsDateString()
  updateTimeEnd?: string;

  // 保留旧字段以兼容旧版前端
  @ApiProperty({
    description: '创建时间(已废弃，请使用createTimeStart和createTimeEnd)',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.createTime !== '')
  @IsDateString()
  createTime?: string;

  @ApiProperty({
    description: '创建结束时间(已废弃，请使用createTimeStart和createTimeEnd)',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.endCreateTime !== '')
  @IsDateString()
  endCreateTime?: string;

  @ApiProperty({
    description: '更新时间(已废弃，请使用updateTimeStart和updateTimeEnd)',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @ValidateIf((o: QueryFormDto) => o.updateTime !== '')
  @IsDateString()
  updateTime?: string;

  @ApiProperty({
    description: '更新结束时间(已废弃，请使用updateTimeStart和updateTimeEnd)',
    required: false,
    deprecated: true,
  })
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

export class ExportFormDto {
  @ApiProperty({
    description: '查询日期 (YYYY-MM-DD)',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: '开始日期 (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '结束日期 (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
