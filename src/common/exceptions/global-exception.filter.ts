import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from './business.exception';

interface ErrorResponse {
  statusCode: number;
  message: string;
  code?: number;
  timestamp: string;
  path: string;
  method: string;
  details?: Record<string, unknown>;
}

/**
 * 全局异常过滤器 - 增强版
 * 提供更详细的错误日志记录和格式化响应
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.url;
    const method = request.method;
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code: number | undefined = undefined;
    let details: Record<string, unknown> | undefined = undefined;

    // 处理业务异常
    if (exception instanceof BusinessException) {
      statusCode = exception.getStatus();
      message = exception.message;
      code = exception.getErrorCode();
      this.logger.warn(`业务异常 [${code}]: ${message} - ${path} (${method})`);
    }
    // 处理HTTP异常
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const exceptionObj = exceptionResponse as Record<string, unknown>;
        message = this.extractErrorMessage(exceptionObj);

        // 提取其他可能的详细信息，但排除敏感信息
        details = this.sanitizeErrorDetails(exceptionObj);
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }

      // 记录日志，根据错误严重性选择日志级别
      this.logHttpException(statusCode, message, path, method, exception);
    }
    // 处理其他未知异常
    else {
      // 未知错误总是记录为错误级别
      this.logUnknownException(exception, path, method);

      // 在生产环境中不暴露内部错误细节
      if (process.env.NODE_ENV !== 'production') {
        message =
          exception instanceof Error ? exception.message : String(exception);
      }
    }

    // 构建统一的错误响应格式
    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      timestamp,
      path,
      method,
    };

    // 只有在业务异常中才添加错误代码
    if (code !== undefined) {
      errorResponse.code = code;
    }

    // 只有在非生产环境且有详情时才添加详情字段
    if (details && Object.keys(details).length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        errorResponse.details = details;
      }
    }

    // 发送响应
    response.status(statusCode).json(errorResponse);
  }

  /**
   * 从异常响应对象中提取错误消息
   */
  private extractErrorMessage(exceptionObj: Record<string, unknown>): string {
    const message = exceptionObj.message;

    if (typeof message === 'string') {
      return message;
    } else if (Array.isArray(message)) {
      return message.join(', ');
    } else {
      return '未知错误';
    }
  }

  /**
   * 记录HTTP异常日志
   */
  private logHttpException(
    statusCode: number,
    message: string,
    path: string,
    method: string,
    exception: unknown,
  ): void {
    if (statusCode >= 500) {
      this.logger.error(
        `HTTP错误 [${statusCode}]: ${message} - ${path} (${method})`,
        exception instanceof Error ? exception.stack : '',
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `HTTP错误 [${statusCode}]: ${message} - ${path} (${method})`,
      );
    }
  }

  /**
   * 记录未知异常日志
   */
  private logUnknownException(
    exception: unknown,
    path: string,
    method: string,
  ): void {
    this.logger.error(
      `未处理异常: ${
        exception instanceof Error ? exception.message : String(exception)
      } - ${path} (${method})`,
      exception instanceof Error ? exception.stack : '',
    );
  }

  /**
   * 清理错误详情中的敏感信息
   */
  private sanitizeErrorDetails(
    details: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!details) return undefined;

    const sanitized = { ...details };

    // 移除标准字段和可能包含敏感信息的字段
    const fieldsToRemove = [
      'message',
      'statusCode',
      'error',
      'stack',
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'credentials',
    ];

    for (const field of fieldsToRemove) {
      delete sanitized[field];
    }

    // 如果对象为空，返回undefined
    if (Object.keys(sanitized).length === 0) {
      return undefined;
    }

    return sanitized;
  }
}
