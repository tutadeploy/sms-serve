import { ApiProperty } from '@nestjs/swagger';

export class MenuDto {
  @ApiProperty({ description: '菜单ID' })
  id!: number;

  @ApiProperty({ description: '菜单名称' })
  name!: string;

  @ApiProperty({ description: '路由地址' })
  path!: string;

  @ApiProperty({ description: '组件路径' })
  component!: string;

  @ApiProperty({ description: '组件名称', required: false })
  componentName?: string;

  @ApiProperty({ description: '图标', required: false })
  icon?: string;

  @ApiProperty({ description: '是否可见' })
  visible!: boolean;

  @ApiProperty({ description: '是否缓存' })
  keepAlive!: boolean;

  @ApiProperty({ description: '是否总是显示', required: false })
  alwaysShow?: boolean;

  @ApiProperty({ description: '父菜单ID' })
  parentId!: number;

  @ApiProperty({ description: '子菜单', type: [MenuDto], required: false })
  children?: MenuDto[];
}

export class RoleDto {
  @ApiProperty({ description: '角色ID' })
  id!: number;

  @ApiProperty({ description: '角色名称' })
  name!: string;
}

export class UserInfoDto {
  @ApiProperty({ description: '用户ID' })
  id!: number;

  @ApiProperty({ description: '用户名' })
  username!: string;

  @ApiProperty({ description: '用户昵称' })
  nickname!: string;

  @ApiProperty({ description: '角色信息', type: [RoleDto] })
  roles!: RoleDto[];

  @ApiProperty({ description: '邮箱' })
  email!: string;

  @ApiProperty({ description: '手机号' })
  mobile!: string;

  @ApiProperty({ description: '性别（0-未知 1-男 2-女）' })
  sex!: number;

  @ApiProperty({ description: '头像URL' })
  avatar!: string;

  @ApiProperty({ description: '状态（0-正常 1-停用）' })
  status!: number;

  @ApiProperty({ description: '备注' })
  remark!: string;

  @ApiProperty({ description: '最后登录IP' })
  loginIp!: string;

  @ApiProperty({ description: '最后登录时间' })
  loginDate!: Date;

  @ApiProperty({ description: '创建时间' })
  createTime!: Date;
}

export class PermissionInfoResponseDto {
  @ApiProperty({ description: '用户信息' })
  user!: UserInfoDto;

  @ApiProperty({ description: '角色列表', type: [String] })
  roles!: string[];

  @ApiProperty({ description: '权限列表', type: [String] })
  permissions!: string[];

  @ApiProperty({ description: '菜单列表', type: [MenuDto] })
  menus!: MenuDto[];
}
