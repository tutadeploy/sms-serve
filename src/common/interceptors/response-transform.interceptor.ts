import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

interface Response<T> {
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, Response<T> | T>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T> | T> {
    return next.handle().pipe(
      map((data: T) => {
        const isPassthrough = this.reflector.get<boolean>(
          'response_passthrough',
          context.getHandler(),
        );

        if (isPassthrough) {
          return data;
        }

        return {
          code: 0,
          data,
          message: 'success',
        };
      }),
    );
  }
}
