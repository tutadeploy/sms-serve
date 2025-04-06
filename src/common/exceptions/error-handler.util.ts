import { Logger } from '@nestjs/common';
import { BusinessException, BusinessErrorCode } from './business.exception';
import { QueryFailedError } from 'typeorm';

/**
 * 错误处理工具类
 * 提供统一的错误处理和转换方法
 */
export class ErrorHandlerUtil {
  /**
   * 处理数据库错误
   * @param error 捕获的错误
   * @param logger 日志记录器
   * @param context 上下文信息
   * @returns 包装后的业务异常
   */
  static handleDatabaseError(
    error: unknown,
    logger: Logger,
    context: string,
  ): BusinessException {
    // 记录原始错误
    logger.error(
      `数据库操作失败 (${context}): ${
        error instanceof Error ? error.message : String(error)
      }`,
      error instanceof Error ? error.stack : undefined,
    );

    // TypeORM特定错误处理
    if (error instanceof QueryFailedError) {
      // SQLite外键约束错误
      if (
        error.message.includes('SQLITE_CONSTRAINT') ||
        error.message.includes('foreign key constraint fails')
      ) {
        return new BusinessException(
          '数据关联约束错误，无法完成操作',
          BusinessErrorCode.GENERAL_ERROR,
        );
      }

      // 唯一约束错误
      if (
        error.message.includes('SQLITE_CONSTRAINT_UNIQUE') ||
        error.message.includes('Duplicate entry') ||
        error.message.includes('unique constraint')
      ) {
        return new BusinessException(
          '数据已存在，请勿重复添加',
          BusinessErrorCode.GENERAL_ERROR,
        );
      }
    }

    // 默认返回一个通用错误
    return new BusinessException(
      '数据库操作失败，请稍后重试',
      BusinessErrorCode.GENERAL_ERROR,
    );
  }

  /**
   * 处理服务调用错误
   * @param error 捕获的错误
   * @param logger 日志记录器
   * @param context 上下文信息
   * @returns 包装后的业务异常
   */
  static handleServiceError(
    error: unknown,
    logger: Logger,
    context: string,
  ): BusinessException {
    // 如果已经是业务异常，直接传递
    if (error instanceof BusinessException) {
      return error;
    }

    // 记录原始错误
    logger.error(
      `服务调用失败 (${context}): ${
        error instanceof Error ? error.message : String(error)
      }`,
      error instanceof Error ? error.stack : undefined,
    );

    // 默认返回一个通用错误
    return new BusinessException(
      '服务处理失败，请稍后重试',
      BusinessErrorCode.GENERAL_ERROR,
    );
  }

  /**
   * 处理外部服务调用错误
   * @param error 捕获的错误
   * @param logger 日志记录器
   * @param context 上下文信息
   * @returns 包装后的业务异常
   */
  static handleExternalServiceError(
    error: unknown,
    logger: Logger,
    context: string,
  ): BusinessException {
    // 记录原始错误
    logger.error(
      `外部服务调用失败 (${context}): ${
        error instanceof Error ? error.message : String(error)
      }`,
      error instanceof Error ? error.stack : undefined,
    );

    // 默认返回第三方服务错误
    return new BusinessException(
      '外部服务调用失败，请稍后重试',
      BusinessErrorCode.THIRD_PARTY_SERVICE_ERROR,
    );
  }

  /**
   * 创建一个"找不到资源"的业务异常
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param errorCode 错误代码
   * @returns 业务异常
   */
  static createNotFoundError(
    resourceType: string,
    resourceId: string | number,
    errorCode: BusinessErrorCode,
  ): BusinessException {
    return new BusinessException(
      `${resourceType} with ID ${resourceId} not found`,
      errorCode,
    );
  }

  /**
   * 从错误中提取错误消息
   * @param error 错误对象
   * @param defaultMessage 默认消息
   * @returns 错误消息
   */
  static getErrorMessage(error: unknown, defaultMessage = '未知错误'): string {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      const errObj = error as { message: unknown };
      if (typeof errObj.message === 'string') {
        return errObj.message;
      }
    }
    return defaultMessage;
  }
}
