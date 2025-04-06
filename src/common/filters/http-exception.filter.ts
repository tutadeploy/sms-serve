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

// 修改为捕获所有异常
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 确定状态码：如果是HttpException则获取其状态码，否则使用500
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 获取错误消息
    let errorMessage: string | string[] = '服务处理请求时发生错误';
    let errorCode: number | undefined = undefined;
    let errorDetails: Record<string, unknown> | null = null;

    // 根据异常类型处理响应消息
    if (exception instanceof BusinessException) {
      // 处理业务异常
      errorCode = exception.getErrorCode();
      errorMessage = exception.message; // 业务异常消息可以直接展示给用户
      const exceptionResponse =
        exception.getResponse() as ExceptionResponseObject;

      if (typeof exceptionResponse === 'object') {
        // 从业务异常中提取其他详情，但排除敏感信息
        errorDetails = this.sanitizeErrorDetails(exceptionResponse);
      }
    } else if (exception instanceof HttpException) {
      // 处理HTTP异常
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObject = exceptionResponse as ExceptionResponseObject;
        errorMessage = responseObject.message || errorMessage;
        errorCode = responseObject.errorCode;
        // 从HTTP异常中提取其他详情，但排除敏感信息
        errorDetails = this.sanitizeErrorDetails(responseObject);
      } else if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
      }
    } else {
      // 对于非HTTP异常，在生产环境中不向客户端暴露详细错误信息
      if (process.env.NODE_ENV !== 'production') {
        errorMessage = exception.message || '未知错误';
      }
    }

    // 提取请求信息以便更好地记录，但确保敏感信息被保护
    const requestInfo = this.sanitizeRequestInfo(request);

    // 构建标准化错误响应
    const errorResponse = {
      status: 1, // 非0表示错误
      code: errorCode || status, // 使用业务错误码或HTTP状态码
      msg: this.formatErrorMessage(errorMessage),
      data: null,
      // 只在非生产环境中或特定条件下包含详细错误信息
      error:
        process.env.NODE_ENV !== 'production'
          ? {
              status,
              details: errorDetails,
              // 只在开发环境中包含堆栈信息
              stack:
                process.env.NODE_ENV === 'development'
                  ? exception.stack
                  : undefined,
            }
          : undefined,
    };

    // 记录错误日志
    const logMessage = `[${status}] ${request.method} ${
      request.url
    } - ${this.formatErrorMessage(errorMessage)}`;

    const logContext = {
      request: requestInfo,
      exception: {
        name: exception.name,
        message: exception.message,
        errorCode,
      },
    };

    if (status >= 500) {
      // 严重错误记录为error级别
      this.logger.error(
        logMessage,
        JSON.stringify(logContext),
        exception.stack,
      );
    } else if (status >= 400) {
      // 客户端错误记录为warning级别
      this.logger.warn(logMessage, JSON.stringify(logContext));
    } else {
      // 其他情况记录为log级别
      this.logger.log(logMessage);
    }

    // 发送响应
    response.status(status).json(errorResponse);
  }

  // 格式化错误消息以便日志记录
  private formatErrorMessage(message: string | string[]): string {
    if (typeof message === 'string') {
      return message;
    } else if (Array.isArray(message)) {
      return message.join(', ');
    }
    return String(message);
  }

  // 清理请求信息中的敏感数据
  private sanitizeRequestInfo(request: Request): Record<string, unknown> {
    return {
      method: request.method,
      url: request.url,
      query: request.query,
      headers: this.sanitizeHeaders(request.headers),
      body: this.sanitizeRequestBody(request.body),
      ip: request.ip,
    };
  }

  // 清理请求头中的敏感信息
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

  // 清理请求体中的敏感信息
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

  // 清理错误详情中的敏感信息
  private sanitizeErrorDetails(
    details: Record<string, unknown>,
  ): Record<string, unknown> | null {
    if (!details) return null;

    const sanitized = { ...details } as Record<string, unknown>;

    // 移除可能包含敏感信息的字段
    delete sanitized.message; // 消息已在顶层提供
    delete sanitized.stack; // 堆栈信息单独处理
    delete sanitized.error; // 错误类型单独处理

    // 移除空对象
    if (Object.keys(sanitized).length === 0) {
      return null;
    }

    return sanitized;
  }
}
