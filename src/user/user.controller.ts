import {
  Controller,
  Post,
  Body,
  Logger,
  Get,
  Query,
  ParseIntPipe,
  Put,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserListPageDto } from './dto/user-list-page.dto';
import { QueryUserPageDto } from './dto/query-user-page.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from './entities/user.entity';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('system/users')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  private transformToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId,
      roles: user.roles,
      createTime: user.createTime,
      updateTime: user.updateTime,
    };
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.userService.create(createUserDto);
    return this.transformToResponseDto(user);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    const user = await this.userService.findOne(id);
    return this.transformToResponseDto(user);
  }

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async findAll(
    @Query('page', ParseIntPipe) page = 1,
    @Query('pageSize', ParseIntPipe) pageSize = 10,
  ): Promise<{ list: UserResponseDto[]; total: number }> {
    const { list, total } = await this.userService.findAll(page, pageSize);
    return {
      list: list.map((user) => this.transformToResponseDto(user)),
      total,
    };
  }

  @Get('package-form-code/:userId')
  @ApiOperation({ summary: '获取用户的包裹表单识别码' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            code: { type: 'string', example: '96809115' },
          },
        },
      },
    },
  })
  async getPackageFormCode(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ code: string }> {
    const code = await this.userService.generatePackageFormCode(userId);
    return { code };
  }

  @Get('by-form-code/:code')
  @ApiOperation({ summary: '通过识别码查找用户' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findByPackageFormCode(
    @Param('code') code: string,
  ): Promise<UserResponseDto> {
    const user = await this.userService.findByPackageFormCode(code);
    return this.transformToResponseDto(user);
  }

  @Put('update')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiQuery({ name: 'id', description: '用户ID', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async update(
    @Query('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`正在更新用户 ID: ${id}`);
    const user = await this.userService.update(id, updateUserDto);
    return user as UserResponseDto;
  }

  @Delete('delete')
  @ApiOperation({ summary: '删除用户' })
  @ApiQuery({ name: 'id', description: '用户ID', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: { example: {} },
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async remove(@Query('id', ParseIntPipe) id: number): Promise<void> {
    this.logger.log(`正在删除用户 ID: ${id}`);
    await this.userService.remove(id);
  }

  @Get('page')
  @ApiOperation({ summary: '分页查询用户列表' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: UserListPageDto,
  })
  async findPage(
    @Query() queryDto: QueryUserPageDto,
  ): Promise<{ list: UserResponseDto[]; total: number }> {
    this.logger.log('正在分页查询用户列表', queryDto);
    const result = await this.userService.findPage(queryDto);
    return result;
  }

  @Get('list-by-tenant')
  @ApiOperation({ summary: '通过租户名查询用户列表 (兼容旧接口)' })
  @ApiQuery({ name: 'tenantName', description: '租户名称', required: true })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 404, description: '租户不存在' })
  async findByTenantName(
    @Query('tenantName') tenantName: string,
  ): Promise<UserResponseDto[]> {
    this.logger.log(`通过租户名 ${tenantName} 查询用户列表`);
    const users = await this.userService.findByTenantName(tenantName);
    return users.map((user) => this.transformToResponseDto(user));
  }
}
