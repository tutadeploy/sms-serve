import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../user/dto/user.dto';

/**
 * 邮件模板响应DTO
 */
export class EmailTemplateResponseDto {
  @ApiProperty({
    description: '邮件模板ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  userId!: number;

  @ApiProperty({
    description: '租户ID',
    example: 1,
    nullable: true,
  })
  tenantId!: number | null;

  @ApiProperty({
    description: '模板名称',
    example: '用户注册确认邮件',
  })
  name!: string;

  @ApiProperty({
    description: '模板代码',
    example: 'USER_REGISTRATION',
  })
  code!: string;

  @ApiProperty({
    description: '邮件主题',
    example: '欢迎注册我们的服务',
  })
  subject!: string;

  @ApiProperty({
    description: 'HTML格式的邮件内容',
    example: '<p>尊敬的 {{name}}，感谢您注册我们的服务！</p>',
    nullable: true,
  })
  bodyHtml!: string | null;

  @ApiProperty({
    description: '纯文本格式的邮件内容',
    example: '尊敬的 {{name}}，感谢您注册我们的服务！',
    nullable: true,
  })
  bodyText!: string | null;

  @ApiProperty({
    description: '变量列表',
    example: ['name', 'link'],
    type: [String],
    nullable: true,
  })
  variables!: string[] | null;

  @ApiProperty({
    description: '创建时间',
    example: '2023-08-01T12:30:00Z',
  })
  createTime!: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2023-08-01T12:36:00Z',
  })
  updateTime!: Date;

  @ApiProperty({
    description: '创建者信息',
    type: () => UserDto,
    nullable: true,
  })
  user?: UserDto;
}
