import { ApiProperty } from '@nestjs/swagger';

class RoleInfo {
  @ApiProperty({ description: '角色编号' })
  id!: number;

  @ApiProperty({ description: '角色名称' })
  name!: string;
}

export class UserProfileResponseDto {
  @ApiProperty({ description: '状态码，0-成功，其他-失败' })
  code!: number;

  @ApiProperty({
    description: '用户信息',
    type: 'object',
    properties: {
      id: { type: 'number', description: '用户编号' },
      username: { type: 'string', description: '用户名' },
      nickname: { type: 'string', description: '用户昵称' },
      roles: {
        type: 'array',
        items: { type: 'object', $ref: '#/components/schemas/RoleInfo' },
        description: '角色信息',
      },
      email: { type: 'string', description: '邮箱' },
      mobile: { type: 'string', description: '手机号' },
      sex: { type: 'number', description: '性别' },
      avatar: { type: 'string', description: '头像' },
      status: { type: 'number', description: '状态' },
      remark: { type: 'string', description: '备注' },
      loginIp: { type: 'string', description: '最后登录IP' },
      loginDate: {
        type: 'string',
        format: 'date-time',
        description: '最后登录时间',
      },
      createTime: {
        type: 'string',
        format: 'date-time',
        description: '创建时间',
      },
    },
  })
  data!: {
    id: number;
    username: string;
    nickname: string;
    roles: RoleInfo[];
    email: string;
    mobile: string;
    sex: number;
    avatar: string;
    status: number;
    remark: string;
    loginIp: string;
    loginDate: Date;
    createTime: Date;
  };

  @ApiProperty({ description: '提示信息' })
  msg!: string;
}
