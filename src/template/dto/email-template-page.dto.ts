import { ApiProperty } from '@nestjs/swagger';
import { EmailTemplateResponseDto } from '../../email-template/dto/email-template-response.dto';

export class EmailTemplatePageDto {
  @ApiProperty({
    description: '邮件模板列表',
    type: [EmailTemplateResponseDto],
  })
  list!: EmailTemplateResponseDto[];

  @ApiProperty({
    description: '总记录数',
    example: 100,
  })
  total!: number;
}
