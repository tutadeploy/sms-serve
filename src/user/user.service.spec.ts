import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User, UserRole } from './entities/user.entity';
import {
  createMockRepository,
  MockRepository,
} from '../common/test/test-utils';

describe('UserService', () => {
  let service: UserService;
  let userRepository: MockRepository;

  const mockUserData = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword123',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    validatePassword: jest.fn(),
    hashPassword: jest.fn(),
    accounts: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));

    // 重置所有模拟的调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneByUsernameOrEmail', () => {
    it('should find a user by username', async () => {
      const mockUser = { ...mockUserData };
      const queryBuilderMock =
        userRepository.createQueryBuilder.mockReturnValue({
          where: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockUser),
        });

      const result = await service.findOneByUsernameOrEmail('testuser');

      expect(queryBuilderMock).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should find a user by email', async () => {
      const mockUser = { ...mockUserData };
      const queryBuilderMock =
        userRepository.createQueryBuilder.mockReturnValue({
          where: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockUser),
        });

      const result = await service.findOneByUsernameOrEmail('test@example.com');

      expect(queryBuilderMock).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should include passwordHash when selectPasswordHash is true', async () => {
      const mockUser = { ...mockUserData };
      const addSelectMock = jest.fn().mockReturnThis();
      const queryBuilderMock =
        userRepository.createQueryBuilder.mockReturnValue({
          where: jest.fn().mockReturnThis(),
          addSelect: addSelectMock,
          getOne: jest.fn().mockResolvedValue(mockUser),
        });

      await service.findOneByUsernameOrEmail('testuser', true);

      expect(queryBuilderMock).toHaveBeenCalled();
      expect(addSelectMock).toHaveBeenCalledWith('user.passwordHash');
    });

    it('should return null when user is not found', async () => {
      const queryBuilderMock =
        userRepository.createQueryBuilder.mockReturnValue({
          where: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        });

      const result = await service.findOneByUsernameOrEmail('nonexistent');

      expect(queryBuilderMock).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findOneById', () => {
    it('should find a user by id', async () => {
      const mockUser = { ...mockUserData };
      userRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findOneById(1);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findOneById(999);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // 如果需要测试其他方法，可以在此处添加更多测试用例
});
