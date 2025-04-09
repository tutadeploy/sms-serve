import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from './business.exception';
import {
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
} from 'jsonwebtoken';

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

  catch(exception: unknown, host: ArgumentsHost) {
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
    let isJwtError = false;

    // 处理业务异常
    if (exception instanceof BusinessException) {
      statusCode = exception.getStatus();
      message = exception.message;
      code = exception.getErrorCode();
      this.logger.warn(`业务异常 [${code}]: ${message} - ${path} (${method})`);
    }
    // 处理 JWT 相关错误
    else if (this.isJwtError(exception)) {
      // 对于JWT错误，我们设置一个标志，以便后面可以用HTTP 200响应
      isJwtError = true;
      // 对内部状态码仍使用401，但HTTP状态码将在响应时设为200
      statusCode = HttpStatus.UNAUTHORIZED;
      code = HttpStatus.UNAUTHORIZED; // 设置业务状态码为401
      message = this.getJwtErrorMessage(exception);
      this.logger.warn(`JWT认证失败: ${message} - ${path} (${method})`);
    }
    // 处理 HTTP 异常
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 处理 401 未授权错误，提供更详细的信息
      if (
        statusCode === HttpStatus.UNAUTHORIZED &&
        !path.endsWith('/system/auth/login')
      ) {
        // 对于HTTP 401错误，我们设置一个标志，以便后面可以用HTTP 200响应
        isJwtError = true;
        code = HttpStatus.UNAUTHORIZED; // 设置业务状态码为401
        message =
          exception instanceof UnauthorizedException
            ? 'Token 无效或缺失'
            : this.extractErrorMessage(exceptionResponse);
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
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

    // 对JWT错误，按照前端要求使用HTTP 200状态码和特定格式响应
    if (isJwtError) {
      return response.status(HttpStatus.OK).json({
        code: HttpStatus.UNAUTHORIZED, // 业务状态码401
        msg: message,
      });
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
   * 判断是否为JWT相关错误
   */
  private isJwtError(exception: unknown): boolean {
    return (
      exception instanceof TokenExpiredError ||
      exception instanceof JsonWebTokenError ||
      exception instanceof NotBeforeError
    );
  }

  /**
   * 获取JWT错误的详细消息
   */
  private getJwtErrorMessage(exception: unknown): string {
    if (exception instanceof TokenExpiredError) {
      return 'Token 已过期';
    } else if (exception instanceof NotBeforeError) {
      return 'Token 尚未生效';
    } else if (exception instanceof JsonWebTokenError) {
      return 'Token 格式无效';
    } else if (
      exception instanceof Error &&
      exception.message.includes('refresh')
    ) {
      return '刷新令牌无效';
    }
    return '身份验证失败';
  }

  /**
   * 从异常响应对象中提取错误消息
   */
  private extractErrorMessage(exceptionObj: unknown): string {
    if (typeof exceptionObj === 'string') {
      return exceptionObj;
    }

    if (typeof exceptionObj !== 'object' || exceptionObj === null) {
      return '未知错误';
    }

    const obj = exceptionObj as Record<string, unknown>;
    const message = obj.message;

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
