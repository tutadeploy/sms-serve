import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserRole } from '../../user/entities/user.entity';
import { InternalServerErrorException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  const mockPayload: JwtPayload = {
    sub: 1,
    username: 'testuser',
    role: UserRole.USER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: {
            findUserById: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') {
                return 'test-secret-key';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw an error if JWT_SECRET is not configured', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);

      try {
        const moduleRef = await Test.createTestingModule({
          providers: [
            JwtStrategy,
            {
              provide: AuthService,
              useValue: {
                findUserById: jest.fn(),
              },
            },
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn().mockReturnValue(null),
              },
            },
          ],
        }).compile();

        moduleRef.get<JwtStrategy>(JwtStrategy);
        fail('Should have thrown an error');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect((error as InternalServerErrorException).message).toContain(
          'JWT_SECRET 未在环境变量中配置',
        );
      }
    });
  });

  describe('validate', () => {
    it('should return the payload', () => {
      const result = strategy.validate(mockPayload);
      expect(result).toEqual(mockPayload);
    });

    // 如果JwtStrategy类中的validate方法实现了更多逻辑（如查询用户、验证用户状态），
    // 这里可以添加更多测试来验证这些情况
  });
});
