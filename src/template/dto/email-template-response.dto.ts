import { ApiProperty } from '@nestjs/swagger';

export class EmailTemplateResponseDto {
  @ApiProperty({ description: '模板ID', example: 1 })
  id!: number;

  @ApiProperty({ description: '用户ID', example: 1 })
  userId!: number;

  @ApiProperty({ description: '租户ID', example: 1, nullable: true })
  tenantId!: number | null;

  @ApiProperty({ description: '模板名称', example: '欢迎邮件' })
  name!: string;

  @ApiProperty({ description: '邮件主题', example: '欢迎加入' })
  subject!: string;

  @ApiProperty({
    description: 'HTML内容',
    example: '<p>Hello</p>',
    nullable: true,
  })
  bodyHtml!: string | null;

  @ApiProperty({ description: '文本内容', example: 'Hello', nullable: true })
  bodyText!: string | null;

  @ApiProperty({
    description: '变量列表',
    example: ['name'],
    type: [String],
    nullable: true,
  })
  variables!: string[] | null;

  @ApiProperty({ description: '创建时间', example: '2023-01-01T00:00:00.000Z' })
  createTime!: Date;

  @ApiProperty({ description: '更新时间', example: '2023-01-01T12:00:00.000Z' })
  updateTime!: Date;
}
