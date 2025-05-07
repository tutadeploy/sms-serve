import { ApiProperty } from '@nestjs/swagger';

export class SmppBalanceResponseDto {
  @ApiProperty({ example: 100.5, description: 'SMPP 账户余额' })
  balance: number;
}
