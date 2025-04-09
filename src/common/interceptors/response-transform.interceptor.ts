import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request } from 'express';

export interface PaginatedData<T> {
  list: T[];
  total: number;
}

interface ResponseData<T> {
  code: number;
  message: string;
  data: T;
}

interface RequestParams {
  query: Record<string, unknown>;
  body: Record<string, unknown>;
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ResponseData<T | PaginatedData<T>>>
{
  private readonly logger = new Logger('HTTP');

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseData<T | PaginatedData<T>>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // 构建请求日志
        const method = request.method;
        const url = request.url;
        const params: RequestParams = {
          query: request.query as Record<string, unknown>,
          body: request.body as Record<string, unknown>,
        };

        // 使用 JSON.stringify 的第三个参数来格式化输出
        const logMessage = `
🚀 Request: ${method} ${url}
📝 Params: ${JSON.stringify(params, null, 2)}
⏱️  Duration: ${duration}ms`;

        this.logger.log(logMessage);
      }),
      map((data: unknown): ResponseData<T | PaginatedData<T>> => {
        // 如果是分页数据，保持原有结构
        if (
          data &&
          typeof data === 'object' &&
          'list' in data &&
          'total' in data
        ) {
          return {
            code: 0,
            message: 'success',
            data: {
              list: data.list,
              total: data.total,
            } as PaginatedData<T>,
          };
        }

        // 其他情况，包装在统一的响应格式中
        return {
          code: 0,
          message: 'success',
          data: data as T,
        };
      }),
      tap((response) => {
        // 打印响应数据
        const logMessage = `
📤 Response:
${JSON.stringify(response, null, 2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        this.logger.log(logMessage);
      }),
    );
  }
}
