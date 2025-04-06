import { Logger } from '@nestjs/common';
import { ErrorHandlerUtil } from '../exceptions/error-handler.util';
import { BusinessException } from '../exceptions/business.exception';

/**
 * 错误处理类型
 */
export enum ErrorHandlerType {
  /** 数据库错误处理 */
  DATABASE = 'database',
  /** 服务错误处理 */
  SERVICE = 'service',
  /** 外部服务错误处理 */
  EXTERNAL = 'external',
}

/**
 * 捕获异常装饰器参数
 */
interface CatchErrorOptions {
  /** 错误处理类型 */
  type: ErrorHandlerType;
  /** 上下文信息(通常是方法名) */
  context?: string;
  /** 自定义的错误处理函数 */
  handler?: (error: unknown, logger: Logger) => BusinessException;
}

// 定义一个更安全的类型用于方法装饰器的目标
type ClassMethodDecoratorTarget = {
  constructor: { name: string };
};

// 定义一个更安全的类型用于方法装饰器的方法
type AsyncClassMethod = (...args: any[]) => Promise<any>;

/**
 * 捕获异常装饰器
 * 用于在服务方法中统一处理异常，避免重复的try/catch代码
 *
 * @param options 配置选项
 * @returns 方法装饰器
 *
 * @example
 * ```typescript
 * @CatchError({ type: ErrorHandlerType.DATABASE })
 * async findById(id: number): Promise<User> {
 *   return this.userRepository.findOneOrFail({ where: { id } });
 * }
 * ```
 */
export function CatchError(options: CatchErrorOptions) {
  return function (
    target: ClassMethodDecoratorTarget,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<AsyncClassMethod>,
  ) {
    // 保存原始方法
    const originalMethod = descriptor.value;

    // 确保原始方法存在
    if (!originalMethod) {
      throw new Error(
        `Method ${propertyKey} does not exist or is not configurable`,
      );
    }

    // 创建logger
    const logger = new Logger(`${target.constructor.name}.${propertyKey}`);

    // 获取上下文信息(如果未提供，则使用类名.方法名)
    const context =
      options.context || `${target.constructor.name}.${propertyKey}`;

    // 替换原始方法
    descriptor.value = async function (...args: any[]): Promise<any> {
      try {
        // 调用原始方法
        return await originalMethod.apply(this, args);
      } catch (error) {
        // 如果提供了自定义处理器，则使用自定义处理器
        if (options.handler) {
          throw options.handler(error, logger);
        }

        // 否则，根据错误类型使用标准处理器
        switch (options.type) {
          case ErrorHandlerType.DATABASE:
            throw ErrorHandlerUtil.handleDatabaseError(error, logger, context);
          case ErrorHandlerType.EXTERNAL:
            throw ErrorHandlerUtil.handleExternalServiceError(
              error,
              logger,
              context,
            );
          case ErrorHandlerType.SERVICE:
          default:
            throw ErrorHandlerUtil.handleServiceError(error, logger, context);
        }
      }
    };

    return descriptor;
  };
}
