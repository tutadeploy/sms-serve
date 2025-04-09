import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy, ValidatedUserPayload } from './local.strategy';
import { AuthService } from '../auth.service';
import { UserRole } from '../../user/entities/user.entity';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;

  // 创建模拟的AuthService
  const mockAuthService = {
    validateUser: jest.fn(),
  };

  // 模拟用户数据
  const mockUser = {
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

  // 预期返回的ValidatedUserPayload
  const expectedUserPayload: ValidatedUserPayload = {
    id: mockUser.id,
    username: mockUser.username,
    email: mockUser.email,
    role: mockUser.role,
    isActive: mockUser.isActive,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);

    // 重置所有模拟的调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return ValidatedUserPayload if credentials are valid', async () => {
      // 设置模拟返回值
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('testuser', 'password123');

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'testuser',
        'password123',
      );
      expect(result).toEqual(expectedUserPayload);
    });

    it('should throw UnauthorizedException if credentials are invalid', async () => {
      // 设置模拟返回值
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('testuser', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'testuser',
        'wrongpassword',
      );
    });
  });
});
