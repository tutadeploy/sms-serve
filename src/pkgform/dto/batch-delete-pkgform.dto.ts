import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'eitherIdsOrDateRange', async: false })
export class EitherIdsOrDateRangeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    const object = args.object as BatchDeletePkgFormDto;
    const hasIds = !!(object.ids && object.ids.length > 0);
    const hasDateRange = !!(object.startDate && object.endDate);

    // 必须提供其中一个，但不能都提供
    return (hasIds && !hasDateRange) || (!hasIds && hasDateRange);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(_args: ValidationArguments): string {
    return '必须提供 ids 数组或 startDate 和 endDate，但不能同时提供。';
  }
}

export class BatchDeletePkgFormDto {
  @ApiPropertyOptional({
    description: '要删除的记录ID数组',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true, message: 'ids数组中的每个元素都必须是数字' })
  @ValidateIf((o: BatchDeletePkgFormDto) => !o.startDate && !o.endDate)
  @IsNotEmpty({ message: '如果未提供日期范围，则ids不能为空' })
  ids?: number[];

  @ApiPropertyOptional({
    description: '删除范围的开始日期 (YYYY-MM-DD 或 ISO 8601 格式)',
    example: '2023-10-26T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate必须是有效的日期字符串' })
  @ValidateIf((o: BatchDeletePkgFormDto) => !o.ids || o.ids.length === 0)
  @IsNotEmpty({ message: '如果未提供ids，则startDate不能为空' })
  startDate?: string;

  @ApiPropertyOptional({
    description: '删除范围的结束日期 (YYYY-MM-DD 或 ISO 8601 格式)',
    example: '2023-10-27T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'endDate必须是有效的日期字符串' })
  @ValidateIf((o: BatchDeletePkgFormDto) => !!o.startDate)
  @IsNotEmpty({ message: '如果提供了startDate，则endDate不能为空' })
  endDate?: string;

  // 应用自定义验证器
  @Validate(EitherIdsOrDateRangeConstraint)
  // 这个字段本身没有实际用途，只是为了触发自定义验证器
  @IsOptional()
  readonly eitherIdsOrDateRange?: null;
}
