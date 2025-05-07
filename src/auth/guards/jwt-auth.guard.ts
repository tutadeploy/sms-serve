// src/auth/decorators/public.decorator.ts (Definition added here as workaround)
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// --- Original Guard Code Starts Below ---
// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 添加调试日志
    console.log('==== JwtAuthGuard 调试信息 ====');
    console.log('请求路径:', context.switchToHttp().getRequest().url);
    console.log('isPublic:', isPublic);
    console.log('handler:', context.getHandler().name);
    console.log('class:', context.getClass().name);
    console.log('============================');

    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
