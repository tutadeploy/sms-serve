import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../user/dto/user.dto';

export class SmsTemplateResponseDto {
  @ApiProperty({ description: '模板ID' })
  id!: number;

  @ApiProperty({ description: '创建者ID' })
  userId!: number;

  @ApiProperty({ description: '租户ID', nullable: true })
  tenantId!: number | null;

  @ApiProperty({ description: '模板名称' })
  name!: string;

  @ApiProperty({ description: '模板内容' })
  content!: string;

  @ApiProperty({ description: '服务商模板ID', required: false })
  providerTemplateId?: string | null;

  @ApiProperty({ description: '变量列表', required: false })
  variables?: string[] | null;

  @ApiProperty({ description: '创建时间' })
  createTime!: Date;

  @ApiProperty({ description: '更新时间' })
  updateTime!: Date;

  @ApiProperty({ description: '创建者信息', type: () => UserDto })
  user?: UserDto;
}
