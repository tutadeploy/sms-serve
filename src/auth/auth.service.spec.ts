import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { User, UserRole } from '../user/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;

  // 模拟用户数据
  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword123',
    role: UserRole.USER,
    isActive: true,
    createTime: new Date(),
    updateTime: new Date(),
    validatePassword: jest.fn(),
    hashPassword: jest.fn(),
    accounts: [],
  };

  // 创建模拟的用户服务
  const mockUserService = {
    findOneByUsernameOrEmail: jest.fn(),
    findOneById: jest.fn(),
  };

  // 创建模拟的JWT服务
  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // 重置所有模拟的调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should validate user and return user object when credentials are valid', async () => {
      // 设置 validatePassword 模拟返回值
      const validatePasswordMock = jest.fn().mockResolvedValue(true);
      const userWithMockFn = {
        ...mockUser,
        validatePassword: validatePasswordMock,
      };
      mockUserService.findOneByUsernameOrEmail.mockResolvedValue(
        userWithMockFn,
      );

      const result = await service.validateUser('testuser', 'password123');

      expect(mockUserService.findOneByUsernameOrEmail).toHaveBeenCalledWith(
        'testuser',
        true,
      );
      expect(validatePasswordMock).toHaveBeenCalledWith('password123');
      expect(result).toEqual(userWithMockFn);
    });

    it('should return null when user is not found', async () => {
      mockUserService.findOneByUsernameOrEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password123');

      expect(mockUserService.findOneByUsernameOrEmail).toHaveBeenCalledWith(
        'nonexistent',
        true,
      );
      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      // 设置 validatePassword 模拟返回值
      const validatePasswordMock = jest.fn().mockResolvedValue(false);
      const userWithMockFn = {
        ...mockUser,
        validatePassword: validatePasswordMock,
      };
      mockUserService.findOneByUsernameOrEmail.mockResolvedValue(
        userWithMockFn,
      );

      const result = await service.validateUser('testuser', 'wrongpassword');

      expect(mockUserService.findOneByUsernameOrEmail).toHaveBeenCalledWith(
        'testuser',
        true,
      );
      expect(validatePasswordMock).toHaveBeenCalledWith('wrongpassword');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should generate an openId for the user', () => {
      const mockToken = 'test.jwt.token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const validatedUser = {
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        email: mockUser.email,
        isActive: mockUser.isActive,
      };

      const result = service.login(validatedUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        username: validatedUser.username,
        sub: validatedUser.id,
        role: validatedUser.role,
      });
      expect(result).toEqual({ openId: mockToken });
    });
  });
});
