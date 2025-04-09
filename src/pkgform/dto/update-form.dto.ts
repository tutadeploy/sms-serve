import { IsString, IsEmail, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFormDto {
  @ApiProperty({ description: '用户识别码（8位）' })
  @IsString()
  @Length(8, 8)
  identificationCode: string;

  @ApiProperty({ description: '姓名' })
  @IsString()
  name: string;

  @ApiProperty({ description: '地址行1' })
  @IsString()
  address1: string;

  @ApiProperty({ description: '地址行2（可选）' })
  @IsString()
  @IsOptional()
  address2?: string;

  @ApiProperty({ description: '城市' })
  @IsString()
  city: string;

  @ApiProperty({ description: '州/省' })
  @IsString()
  state: string;

  @ApiProperty({ description: '邮政编码' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: '邮箱地址' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '电话号码' })
  @IsString()
  phone: string;

  @ApiProperty({ description: '持卡人姓名' })
  @IsString()
  cardholder: string;

  @ApiProperty({ description: '卡号' })
  @IsString()
  cardNumber: string;

  @ApiProperty({ description: '有效期 (MM/YYYY)' })
  @IsString()
  @Length(7, 7)
  expireDate: string;

  @ApiProperty({ description: 'CVV' })
  @IsString()
  @Length(3, 4)
  cvv: string;
}
