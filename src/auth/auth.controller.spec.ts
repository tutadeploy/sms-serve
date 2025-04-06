import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { ValidatedUserPayload } from './strategies/local.strategy';
import { UserRole } from '../user/entities/user.entity';

// 创建部分模拟请求类型
type PartialMockRequest<T> = {
  user: T;
};

describe('AuthController', () => {
  let controller: AuthController;

  // 模拟 AuthService
  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    // 重置所有模拟的调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return openId from auth service', () => {
      const mockOpenId = { openId: 'test.jwt.token' };
      const mockUser: ValidatedUserPayload = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER,
        isActive: true,
      };
      const loginDto: LoginUserDto = {
        username: 'testuser',
        password: 'password123',
      };

      // 模拟 Request 对象，使用部分实现
      const req = {
        user: mockUser,
      } as PartialMockRequest<ValidatedUserPayload>;

      // 设置 authService.login 的返回值
      mockAuthService.login.mockReturnValue(mockOpenId);

      const result = controller.login(req as any, loginDto);

      // 修复lint错误: 使用回调函数替代直接引用方法
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockOpenId);
    });
  });

  describe('getProfile', () => {
    it('should return the JWT payload from request.user', () => {
      const mockPayload = {
        sub: 1,
        username: 'testuser',
        role: UserRole.USER,
      };

      const req = {
        user: mockPayload,
      };

      const result = controller.getProfile(req as any);

      expect(result).toEqual(mockPayload);
    });
  });
});
