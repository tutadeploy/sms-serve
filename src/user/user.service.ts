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
import { QueryUserPageDto } from './dto/query-user-page.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserPermissionDto } from './dto/user-permission.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly saltRounds = 10;

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

    // 查找租户
    const tenant = await this.tenantService.findByName(
      createUserDto.tenantname,
    );

    // 创建新用户对象
    const user = new User();
    user.username = createUserDto.username;
    user.password = createUserDto.password; // 实体的 @BeforeInsert 钩子会处理密码哈希
    user.role = createUserDto.role;
    user.tenantId = tenant.id;
    user.tenant = tenant;
    user.isActive = true;

    // 保存用户
    const savedUser = await this.userRepository.save(user);

    // 创建用户租户角色关联
    await this.userRepository
      .createQueryBuilder()
      .insert()
      .into('user_tenant_roles')
      .values({
        user_id: savedUser.id,
        tenant_id: tenant.id,
        role: savedUser.role,
      })
      .execute();

    return savedUser;
  }

  /**
   * 查询所有用户（分页）
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 用户列表和总数
   */
  async findAll(
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ list: User[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createTime: 'DESC' },
      relations: ['roles'],
    });

    return { list: users, total };
  }

  /**
   * 通过ID查询用户
   * @param id 用户ID
   * @returns 用户对象
   */
  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
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
        'tenantId',
        'createTime',
        'updateTime',
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
        'createTime',
        'updateTime',
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
    const user = await this.findOne(id);

    // 如果更新密码，需要加密
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        this.saltRounds,
      );
    }

    // 更新用户信息
    const updatedUser = Object.assign(user, updateUserDto) as User;
    return this.userRepository.save(updatedUser);
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns 操作成功
   */
  async remove(id: number): Promise<void> {
    this.logger.log(`Removing user ID: ${id}`);

    const user = await this.findOne(id);
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

  /**
   * 通过租户名查询用户列表
   * @param tenantname 租户名称
   * @returns 用户列表
   */
  async findByTenantName(tenantname: string): Promise<User[]> {
    this.logger.log(`Finding users by tenant name: ${tenantname}`);

    // 查找租户
    const tenant = await this.tenantService.findByName(tenantname);

    // 查找该租户下的所有用户
    const users = await this.userRepository.find({
      where: { tenantId: tenant.id },
      relations: ['tenant'],
    });

    // 删除敏感信息
    return users.map((user) => {
      const userResponse = { ...user } as Partial<User> & {
        passwordHash?: string;
      };
      delete userResponse.passwordHash;
      return userResponse as User;
    });
  }

  /**
   * 分页查询用户列表
   * @param queryDto 分页和筛选参数
   * @returns 用户列表和总数
   */
  async findPage(
    queryDto: QueryUserPageDto,
  ): Promise<{ list: UserResponseDto[]; total: number }> {
    const { pageNo = 1, pageSize = 10, username, email, tenantId } = queryDto;
    const skip = (pageNo - 1) * pageSize;

    const where: FindOptionsWhere<User> = {};
    if (username) {
      where.username = username;
    }
    if (email) {
      where.email = email;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      skip,
      take: pageSize,
      order: { createTime: 'DESC' },
      relations: ['tenant'],
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        tenantId: true,
        createTime: true,
        updateTime: true,
      },
    });

    return { list: users as UserResponseDto[], total };
  }

  /**
   * 获取用户权限信息
   * @param userId 用户ID
   * @returns 用户权限信息
   */
  async getUserPermissions(userId: number): Promise<UserPermissionDto> {
    this.logger.log(`Getting permissions for user ID: ${userId}`);

    // 根据角色获取权限列表
    const rolePermissionMap = {
      [UserRole.ADMIN]: [
        'user:create',
        'user:read',
        'user:update',
        'user:delete',
        'tenant:create',
        'tenant:read',
        'tenant:update',
        'tenant:delete',
        'template:create',
        'template:read',
        'template:update',
        'template:delete',
        'notification:create',
        'notification:read',
        'notification:send',
        'account:create',
        'account:read',
        'account:update',
      ],
      [UserRole.USER]: [
        'user:read',
        'template:read',
        'template:create',
        'notification:read',
        'notification:send',
        'account:read',
      ],
    };

    // 获取用户信息
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user) {
      throw new NotFoundException(`用户ID ${userId} 不存在`);
    }

    // 根据用户角色获取权限
    const permissions = rolePermissionMap[user.role] || [];

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name || null,
      permissions,
    };
  }

  async getUserProfile(userId: number) {
    const user = await this.findOne(userId);
    return user;
  }

  /**
   * 生成并保存用户的包裹表单识别码
   * @param userId 用户ID
   * @returns 生成的识别码
   */
  async generatePackageFormCode(userId: number): Promise<string> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // 如果用户已经有识别码，直接返回
    if (user.packageFormCode) {
      return user.packageFormCode;
    }

    // 生成新的识别码
    let code = crypto.randomBytes(4).toString('hex');
    let isUnique = false;

    // 确保生成的识别码是唯一的
    while (!isUnique) {
      const existingUser = await this.userRepository.findOne({
        where: { packageFormCode: code },
      });

      if (!existingUser) {
        isUnique = true;
      } else {
        code = crypto.randomBytes(4).toString('hex');
      }
    }

    // 保存识别码
    user.packageFormCode = code;
    await this.userRepository.save(user);

    return code;
  }

  /**
   * 通过识别码查找用户
   * @param code 识别码
   * @returns 用户对象
   */
  async findByPackageFormCode(code: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { packageFormCode: code },
    });

    if (!user) {
      throw new NotFoundException(`Invalid package form code: ${code}`);
    }

    return user;
  }
}
