import { ApiProperty } from '@nestjs/swagger';

export class BukaBalanceResponseDto {
  @ApiProperty({ example: 0, description: '响应码，0表示成功' })
  code: number;

  @ApiProperty({ example: 'success', description: '响应消息' })
  message: string;

  @ApiProperty({ example: { balance: 18.2556 }, description: '响应数据' })
  data: { balance: number };
}
