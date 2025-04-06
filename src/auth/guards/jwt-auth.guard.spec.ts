import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  // 由于JwtAuthGuard直接继承自AuthGuard且没有添加自定义逻辑
  // 这个测试主要是为了确保可以正确实例化
  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // 注意：这个守卫完全继承自NestJS的AuthGuard，没有自定义逻辑
  // 所以我们不需要测试canActivate方法的具体实现
  // 如果将来添加了自定义逻辑，再添加相应的测试
});
