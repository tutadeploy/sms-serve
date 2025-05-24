import { ApiProperty } from '@nestjs/swagger';

export class SmsChannelVO {
  @ApiProperty({ description: '渠道ID' })
  id: number;

  @ApiProperty({ description: '渠道名称' })
  name: string;

  @ApiProperty({ description: '渠道代码' })
  code: string;

  @ApiProperty({ description: '渠道状态：0-禁用，1-启用' })
  status: number;

  @ApiProperty({ description: '供应商ID' })
  providerId: number;

  @ApiProperty({ description: '渠道描述', required: false })
  description?: string;

  @ApiProperty({ description: '创建时间', required: false })
  createTime?: string;

  @ApiProperty({ description: '更新时间', required: false })
  updateTime?: string;
}

export class SmsChannelListRespVO {
  @ApiProperty({ description: '渠道列表', type: [SmsChannelVO] })
  list: SmsChannelVO[];

  @ApiProperty({ description: '总数' })
  total: number;
}
