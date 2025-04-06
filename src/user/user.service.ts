import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  BusinessException,
  BusinessErrorCode,
} from '../common/exceptions/business.exception';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tenantService: TenantService,
  ) {}

  /**
   * 创建新用户
   * @param createUserDto 用户创建数据
   * @returns 创建后的用户
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating new user: ${createUserDto.username}`);

    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new BusinessException(
        '用户名已存在',
        BusinessErrorCode.USER_ALREADY_EXISTS,
      );
    }

    // 创建新用户对象
    const user = new User();
    user.username = createUserDto.username;
    user.email = createUserDto.email;

    // 直接设置password属性，让实体的@BeforeInsert钩子处理哈希
    user.password = createUserDto.password;
    user.isActive = true;

    // 如果提供了租户名称，则关联租户
    if (createUserDto.tenantName) {
      try {
        const tenant = await this.tenantService.findByName(
          createUserDto.tenantName,
        );
        user.tenantId = tenant.id;
      } catch {
        this.logger.warn(`找不到租户: ${createUserDto.tenantName}`);
        // 不抛出异常，如果找不到租户则不关联
      }
    }

    // 设置管理员角色
    if (createUserDto.isAdmin) {
      user.role = UserRole.ADMIN;
    }

    // 保存用户
    return this.userRepository.save(user);
  }

  /**
   * 查询所有用户
   * @returns 用户列表
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * 通过ID查询用户
   * @param id 用户ID
   * @returns 用户对象
   */
  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`用户ID ${id} 不存在`);
    }

    return user;
  }

  /**
   * 通过用户名查询用户
   * @param username 用户名
   * @returns 用户对象
   */
  async findByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { username },
      select: [
        'id',
        'username',
        'email',
        'passwordHash',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`用户名 ${username} 不存在`);
    }

    return user;
  }

  /**
   * 通过用户名或邮箱查询用户
   * @param usernameOrEmail 用户名或邮箱
   * @returns 用户对象
   */
  async findByUsernameOrEmail(usernameOrEmail: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      select: [
        'id',
        'username',
        'email',
        'passwordHash',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`用户 ${usernameOrEmail} 不存在`);
    }

    return user;
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param updateUserDto 更新数据
   * @returns 更新后的用户
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Updating user ID: ${id}`);

    // 查找用户
    const user = await this.findById(id);

    // 更新字段
    if (updateUserDto.email) {
      user.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      // 直接设置password属性，让实体的@BeforeUpdate钩子处理哈希
      user.password = updateUserDto.password;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    // 保存更新
    return this.userRepository.save(user);
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns 操作成功
   */
  async remove(id: number): Promise<void> {
    this.logger.log(`Removing user ID: ${id}`);

    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }

  /**
   * 根据用户名或邮箱查找用户
   * @param usernameOrEmail 用户名或邮箱
   * @param selectPasswordHash 是否在查询结果中包含 passwordHash 字段
   * @returns 用户实体 或 null
   */
  async findOneByUsernameOrEmail(
    usernameOrEmail: string,
    selectPasswordHash = false,
  ): Promise<User | null> {
    const where: FindOptionsWhere<User>[] = [
      { username: usernameOrEmail },
      { email: usernameOrEmail },
    ];

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    queryBuilder.where(where);

    if (selectPasswordHash) {
      queryBuilder.addSelect('user.passwordHash'); // 明确选择 passwordHash
    }

    const user = await queryBuilder.getOne();
    return user;
  }
}
