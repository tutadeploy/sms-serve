import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { PaginationReqDto } from '../../common/dto/pagination-req.dto';

export enum UserStatus {
  ENABLED = 1,
  DISABLED = 0,
}

export class QueryUserPageDto extends PaginationReqDto {
  @ApiProperty({
    description: '用户名',
    required: false,
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: '手机号',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '邮箱',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: '状态：0-禁用，1-启用',
    required: false,
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  @Transform(({ value }) => {
    if (value === undefined || value === '') {
      return undefined;
    }
    return Number(value);
  })
  status?: UserStatus;

  @ApiProperty({
    description: '租户ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    if (value === undefined || value === '') {
      return undefined;
    }
    return Number(value);
  })
  tenantId?: number;

  toQuery(): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (this.username) {
      query.username = this.username;
    }
    if (this.phone) {
      query.phone = this.phone;
    }
    if (this.email) {
      query.email = this.email;
    }
    if (this.status !== undefined) {
      query.status = this.status;
    }
    if (this.tenantId !== undefined) {
      query.tenantId = this.tenantId;
    }

    return query;
  }
}
