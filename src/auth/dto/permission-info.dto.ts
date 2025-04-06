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

export class UserInfoDto {
  @ApiProperty({ description: '用户ID' })
  id!: number;

  @ApiProperty({ description: '用户昵称' })
  nickname!: string;

  @ApiProperty({ description: '用户头像' })
  avatar!: string;

  @ApiProperty({ description: '部门ID', required: false })
  deptId!: number | null;
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
