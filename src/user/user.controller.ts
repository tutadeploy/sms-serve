import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

@ApiTags('user')
@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: '注册新用户（仅用于内部管理）' })
  @ApiResponse({
    status: 201,
    description: '用户创建成功',
    type: User,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '用户名或邮箱已存在' })
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`正在创建新用户: ${createUserDto.username}`);

    // 记录完整的请求内容用于调试
    console.log('Full request DTO:', JSON.stringify(createUserDto));
    console.log('Registration request received:', {
      username: createUserDto.username,
      email: createUserDto.email,
      hasPassword: !!createUserDto.password,
      passwordLength: createUserDto.password?.length,
      confirmPasswordMatches:
        createUserDto.password === createUserDto.confirmPassword,
    });

    const user = await this.userService.create(createUserDto);

    // 删除敏感信息 - 使用类型断言确保类型安全
    const userResponse = { ...user } as Partial<User> & {
      passwordHash?: string;
    };
    delete userResponse.passwordHash;

    return userResponse as User;
  }
}
