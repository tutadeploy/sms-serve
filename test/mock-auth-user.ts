import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../src/user/entities/user.entity';

/**
 * 创建模拟的用户身份验证令牌，用于端到端测试
 *
 * @param user 用户对象
 * @returns JWT令牌
 */
export function createMockAuthToken(user: Partial<User>): string {
  const jwtService = new JwtService({
    secret: 'test-jwt-secret',
    signOptions: { expiresIn: '1h' },
  });

  const payload = {
    sub: user.id || 1,
    username: user.username || 'testuser',
    role: user.role || UserRole.USER,
    userId: user.id || 1,
  };

  return jwtService.sign(payload);
}

/**
 * 创建标准的测试用户对象
 *
 * @param overrides 可以覆盖默认值的对象
 * @returns 测试用户对象
 */
export function createTestUser(overrides: Partial<User> = {}): Partial<User> {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2b$10$123456789012345678901234567890',
    role: UserRole.USER,
    isActive: true,
    ...overrides,
  };
}

/**
 * 创建模拟的管理员用户
 *
 * @returns 管理员用户对象
 */
export function createTestAdmin(): Partial<User> {
  return createTestUser({
    id: 2,
    username: 'admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  });
}
