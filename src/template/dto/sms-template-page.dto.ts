import { ApiProperty } from '@nestjs/swagger';
import { SmsTemplateResponseDto } from './sms-template-response.dto';

export class SmsTemplatePageDto {
  @ApiProperty({ description: '短信模板列表', type: [SmsTemplateResponseDto] })
  list!: SmsTemplateResponseDto[];

  @ApiProperty({ description: '总记录数', example: 50 })
  total!: number;
}
