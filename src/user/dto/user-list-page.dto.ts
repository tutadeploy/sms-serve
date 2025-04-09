import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class UserListPageDto {
  @ApiProperty({
    description: '用户列表',
    type: [UserResponseDto],
  })
  list!: UserResponseDto[];

  @ApiProperty({
    description: '总记录数',
    example: 100,
  })
  total!: number;
}
