import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

// 修改接口以包含索引签名，兼容Record<string, unknown>
interface ExceptionResponseObject {
  message: string | string[];
  statusCode?: number;
  errorCode?: number;
  error?: string;
  [key: string]: unknown; // 添加索引签名
}

// 规范化的错误响应结构
interface StandardErrorResponse {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  // 可以选择性添加业务错误码
  errorCode?: number;
}

// 修改为捕获所有异常
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 确定状态码：如果是HttpException则获取其状态码，否则使用500
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 获取错误消息
    let errorMessage: string = '服务处理请求时发生错误';
    let businessErrorCode: number | undefined = undefined;

    // 根据异常类型处理响应消息
    if (exception instanceof BusinessException) {
      // 处理业务异常
      businessErrorCode = exception.getErrorCode();
      errorMessage = exception.message; // 业务异常消息可以直接展示给用户
    } else if (exception instanceof HttpException) {
      // 处理HTTP异常
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object') {
        const responseObject = exceptionResponse as ExceptionResponseObject;
        // 尝试从NestJS内置异常的message数组中获取信息
        if (Array.isArray(responseObject.message)) {
          errorMessage = responseObject.message.join(', ');
        } else if (typeof responseObject.message === 'string') {
          errorMessage = responseObject.message;
        }
        // 可以考虑从 responseObject.error 获取更通用的错误描述，如 'Bad Request'
      } else if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
      }
    } else {
      // 对于非HTTP异常，在生产环境中不向客户端暴露详细错误信息
      if (process.env.NODE_ENV !== 'production') {
        errorMessage = exception.message || '未知错误';
      }
    }

    // 构建标准错误响应
    const errorResponse: StandardErrorResponse = {
      statusCode: httpStatus,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      // 如果是业务异常，添加业务错误码
      errorCode: businessErrorCode,
    };

    // 记录错误日志 (日志格式保持不变，方便内部追踪)
    const logMessage = `[${httpStatus}] ${request.method} ${request.url} - ${errorMessage}`;
    const requestInfo = this.sanitizeRequestInfo(request);
    const logContext = {
      request: requestInfo,
      exception: {
        name: exception.name,
        message: exception.message,
        businessErrorCode,
      },
    };

    if (httpStatus >= 500) {
      this.logger.error(
        logMessage,
        JSON.stringify(logContext),
        exception.stack,
      );
    } else if (httpStatus >= 400) {
      this.logger.warn(logMessage, JSON.stringify(logContext));
    } else {
      this.logger.log(logMessage);
    }

    // 发送规范化的错误响应
    response.status(httpStatus).json(errorResponse);
  }

  // 清理请求信息中的敏感数据 (保持不变)
  private sanitizeRequestInfo(request: Request): Record<string, unknown> {
    return {
      method: request.method,
      url: request.url,
      query: request.query,
      headers: this.sanitizeHeaders(request.headers as Record<string, unknown>),
      body: this.sanitizeRequestBody(request.body),
      ip: request.ip,
    };
  }

  // 清理请求头中的敏感信息 (保持不变)
  private sanitizeHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitizedHeaders = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-auth-token',
      'x-api-key',
      'x-access-token',
      'token',
    ];

    for (const header of sensitiveHeaders) {
      if (
        header in sanitizedHeaders &&
        sanitizedHeaders[header] !== undefined
      ) {
        sanitizedHeaders[header] = '[REDACTED]';
      }
    }

    return sanitizedHeaders;
  }

  // 清理请求体中的敏感信息 (保持不变)
  private sanitizeRequestBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    // 创建副本以避免修改原始请求
    const sanitized = { ...body } as Record<string, unknown>;

    // 清理敏感字段
    const sensitiveFields = [
      'password',
      'passwordConfirmation',
      'token',
      'apiKey',
      'apiSecret',
      'secret',
      'appsecret',
      'appSecret',
      'accessKey',
      'secretKey',
      'creditCard',
      'cardNumber',
      'cvv',
      'credentials',
      'private',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized && sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // 这个方法不再需要，因为我们简化了错误响应结构
  // private sanitizeErrorDetails(
  //   details: Record<string, unknown>,
  // ): Record<string, unknown> | null { ... }
}
