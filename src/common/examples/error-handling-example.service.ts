import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CatchError,
  ErrorHandlerType,
} from '../decorators/catch-error.decorator';
import {
  BusinessException,
  BusinessErrorCode,
} from '../exceptions/business.exception';
import { ErrorHandlerUtil } from '../exceptions/error-handler.util';

// 用于示例的虚构实体
class ExampleEntity {}

/**
 * 错误处理示例服务类
 * 这个类包含了多种错误处理模式的示例
 * 可以作为其他服务实现的参考
 */
@Injectable()
export class ErrorHandlingExampleService {
  private readonly logger = new Logger(ErrorHandlingExampleService.name);

  constructor(
    // 假设注入了一个Repository
    @InjectRepository(ExampleEntity)
    private readonly exampleRepository: Repository<object>,
  ) {}

  /**
   * 使用装饰器处理数据库错误的示例
   * 这是推荐的方式，因为它减少了重复代码
   */
  @CatchError({ type: ErrorHandlerType.DATABASE })
  async findById(id: number): Promise<unknown> {
    return this.exampleRepository.findOneOrFail({ where: { id } });
  }

  /**
   * 使用装饰器处理外部服务错误的示例
   */
  @CatchError({ type: ErrorHandlerType.EXTERNAL, context: 'callExternalApi' })
  async callExternalApi(params: unknown): Promise<unknown> {
    // 这里是调用外部API的代码
    // 添加一个模拟的await调用
    const response = await Promise.resolve({ success: true, data: params });
    // 如果发生错误，装饰器会自动捕获并处理
    return response;
  }

  /**
   * 使用自定义错误处理器的装饰器示例
   */
  @CatchError({
    type: ErrorHandlerType.SERVICE,
    handler: (error, logger) => {
      logger.warn(
        `特别处理: ${error instanceof Error ? error.message : String(error)}`,
      );
      return new BusinessException(
        '特别的错误处理逻辑',
        BusinessErrorCode.GENERAL_ERROR,
      );
    },
  })
  async customErrorHandling(): Promise<unknown> {
    // 添加一个模拟的await调用
    await Promise.resolve();
    throw new Error('This will be handled by the custom handler');
  }

  /**
   * 传统的try/catch错误处理示例
   * 在某些情况下，你可能需要更细粒度的控制
   */
  async traditionalErrorHandling(id: number): Promise<unknown> {
    try {
      const result = await this.exampleRepository.findOne({ where: { id } });

      if (!result) {
        throw new BusinessException(
          `Resource with ID ${id} not found`,
          BusinessErrorCode.TEMPLATE_NOT_FOUND,
        );
      }

      return result;
    } catch (error) {
      // 如果已经是业务异常，则直接抛出
      if (error instanceof BusinessException) {
        throw error;
      }

      // 否则使用工具类处理错误
      throw ErrorHandlerUtil.handleDatabaseError(
        error,
        this.logger,
        'traditionalErrorHandling',
      );
    }
  }

  /**
   * 使用ErrorHandlerUtil创建NotFound错误的示例
   */
  async getResourceById(id: number): Promise<unknown> {
    const resource = await this.exampleRepository.findOne({ where: { id } });

    if (!resource) {
      throw ErrorHandlerUtil.createNotFoundError(
        'Resource',
        id,
        BusinessErrorCode.TEMPLATE_NOT_FOUND,
      );
    }

    return resource;
  }

  /**
   * 包含多个try/catch块的复杂方法示例
   * 展示如何处理不同类型的错误
   */
  async complexOperationWithMultipleErrorTypes(
    id: number,
    externalData: unknown,
  ): Promise<unknown> {
    try {
      // 第一步：从数据库读取数据
      const resource = await this.findById(id).catch((error) => {
        // 重新抛出，但保留原始错误类型
        throw error;
      });

      try {
        // 第二步：调用外部服务
        const externalResult = await this.callExternalApi(externalData);

        // 第三步：处理结果并返回
        return {
          resourceId: id,
          resourceData: resource,
          externalData: externalResult,
        };
      } catch (externalError) {
        // 处理外部服务特定错误
        this.logger.warn(
          `外部服务调用失败: ${ErrorHandlerUtil.getErrorMessage(externalError)}`,
        );

        // 返回部分结果，而不是完全失败
        return {
          resourceId: id,
          resourceData: resource,
          externalData: null,
          externalError: '外部服务暂时不可用',
        };
      }
    } catch (error) {
      // 处理整体操作错误
      this.logger.error(
        `复杂操作失败: ${ErrorHandlerUtil.getErrorMessage(error)}`,
      );

      // 区分错误类型并适当处理
      if (
        error instanceof NotFoundException ||
        (error instanceof BusinessException &&
          error.getErrorCode() === BusinessErrorCode.TEMPLATE_NOT_FOUND)
      ) {
        // 资源不存在错误
        throw error;
      }

      // 其他错误统一处理为服务错误
      throw ErrorHandlerUtil.handleServiceError(
        error,
        this.logger,
        'complexOperationWithMultipleErrorTypes',
      );
    }
  }
}
