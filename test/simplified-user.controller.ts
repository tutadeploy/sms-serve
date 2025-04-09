import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './simplified-entities/user.entity';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// 用于安全返回用户数据的接口
interface SafeUserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createTime: Date;
  updateTime: Date;
}

interface JwtUser {
  userId: number;
  username: string;
  role: UserRole;
}

@Controller('user')
export class UserController {
  private readonly logger = new Logger('UserController');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserRequest): Promise<any> {
    this.logger.log(`注册新用户: ${createUserDto.username}`);

    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (existingUser) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: '用户名已存在',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 检查密码是否匹配
    if (createUserDto.password !== createUserDto.confirmPassword) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: '两次输入的密码不一致',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 创建新用户
    const user = this.userRepository.create(createUserDto);

    // 确保手动触发密码哈希
    user.password = createUserDto.password;
    user.hashPassword();

    const savedUser = await this.userRepository.save(user);

    // 创建安全的用户返回对象
    const safeUser: SafeUserResponse = {
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      isActive: savedUser.isActive,
      createTime: savedUser.createTime,
      updateTime: savedUser.updateTime,
    };

    return {
      status: 0,
      data: safeUser,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: Record<string, any>): Promise<any> {
    const user = req.user as JwtUser;
    const userRole = user?.role || UserRole.USER;
    this.logger.log(`获取所有用户列表，请求用户角色: ${userRole}`);

    // 只有管理员可以查看所有用户
    if (userRole !== UserRole.ADMIN) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          message: '无权限查看用户列表',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const users = await this.userRepository.find();

    // 移除敏感信息
    const safeUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createTime: user.createTime,
      updateTime: user.updateTime,
    }));

    return {
      status: 0,
      data: safeUsers,
    };
  }
}
