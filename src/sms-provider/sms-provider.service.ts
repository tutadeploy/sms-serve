import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { SmsProvider } from './entities/sms-provider.entity';
import { CreateSmsProviderDto } from './dto/create-sms-provider.dto';
import { UpdateSmsProviderDto } from './dto/update-sms-provider.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsProviderService {
  private readonly logger = new Logger(SmsProviderService.name);

  constructor(
    @InjectRepository(SmsProvider)
    private readonly smsProviderRepository: Repository<SmsProvider>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async findOne(id: number): Promise<SmsProvider | null> {
    try {
      return await this.smsProviderRepository.findOne({
        where: { id, isActive: true },
      });
    } catch (error) {
      this.logger.error(
        `Error finding SMS provider with ID ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async findById(id: number): Promise<SmsProvider | null> {
    return this.findOne(id);
  }

  async findAll(onlyActive = true): Promise<SmsProvider[]> {
    try {
      return await this.smsProviderRepository.find({
        where: onlyActive ? { isActive: true } : {},
        order: { name: 'ASC' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding SMS providers: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  // 创建供应商配置
  async create(createDto: CreateSmsProviderDto): Promise<SmsProvider> {
    try {
      // 检查是否已存在同名供应商
      const existingProvider = await this.smsProviderRepository.findOne({
        where: {
          name: createDto.name,
          tenantId: createDto.tenantId, // 添加租户条件
        },
      });

      if (existingProvider) {
        throw new BadRequestException(
          `名称为"${createDto.name}"的供应商已经为租户${createDto.tenantId}配置`,
        );
      }

      // 创建新供应商配置
      const provider = this.smsProviderRepository.create(createDto);
      return this.smsProviderRepository.save(provider);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`创建供应商配置失败: ${errorMessage}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`创建供应商配置失败: ${errorMessage}`);
    }
  }

  // 更新供应商配置
  async update(
    id: number,
    updateDto: UpdateSmsProviderDto,
  ): Promise<SmsProvider> {
    try {
      const provider = await this.findOne(id);
      if (!provider) {
        throw new NotFoundException(`ID为${id}的供应商不存在`);
      }

      // // 如果更新了API密钥，验证其有效性
      // if (
      //   updateDto.apiKey ||
      //   updateDto.apiSecret ||
      //   (updateDto.configDetails && updateDto.configDetails.appid)
      // ) {
      //   await this.validateProviderCredentials({
      //     name: provider.name,
      //     apiKey: updateDto.apiKey || provider.apiKey,
      //     apiSecret: updateDto.apiSecret || provider.apiSecret,
      //     configDetails: updateDto.configDetails || provider.configDetails,
      //   });
      // }

      // 处理configDetails字段，将其转换为JSON对象
      const updateData: Partial<SmsProvider> = { ...updateDto };
      if (updateDto.configDetails) {
        // 确保configDetails以正确的格式存储
        updateData.configDetails = updateDto.configDetails;
      }

      await this.smsProviderRepository.update(id, updateData);

      const updatedProvider = await this.findOne(id);
      if (!updatedProvider) {
        throw new NotFoundException(`更新后无法找到ID为${id}的供应商`);
      }

      return updatedProvider;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`更新供应商配置失败: ${errorMessage}`);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(`更新供应商配置失败: ${errorMessage}`);
    }
  }

  // 不返回密钥的供应商列表
  async findAllWithoutSecrets(): Promise<Partial<SmsProvider>[]> {
    const providers = await this.findAll(false); // 获取所有供应商，包括未激活的
    return providers.map((p) => this.omitSecrets(p));
  }

  // 不返回密钥的单个供应商
  async findOneWithoutSecrets(
    id: number,
  ): Promise<Partial<SmsProvider> | null> {
    const provider = await this.smsProviderRepository.findOne({
      where: { id },
    });
    if (!provider) return null;
    return this.omitSecrets(provider);
  }

  // 去除敏感信息
  private omitSecrets(provider: SmsProvider): Partial<SmsProvider> {
    // provider已经没有apiSecret字段，直接返回即可
    // 如果configDetails中有敏感信息，可以在这里处理
    if (provider.configDetails && typeof provider.configDetails === 'object') {
      const { configDetails, ...rest } = provider;
      // 创建configDetails的副本，移除敏感字段
      const safeConfigDetails = { ...configDetails };

      // 如果configDetails中有apiSecret，删除它
      if ('apiSecret' in safeConfigDetails) {
        delete safeConfigDetails['apiSecret'];
      }

      return {
        ...rest,
        configDetails: safeConfigDetails,
      };
    }

    return provider;
  }

  // // 验证供应商凭证
  // private async validateProviderCredentials(
  //   provider: Partial<CreateSmsProviderDto | SmsProvider>,
  // ): Promise<boolean> {
  //   // 基本验证
  //   if (!provider.apiKey || !provider.apiSecret) {
  //     throw new BadRequestException('API密钥和密钥密文不能为空');
  //   }

  //   // 根据供应商类型验证凭证
  //   switch (provider.name?.toLowerCase()) {
  //     case 'onbuka': {
  //       // 安全地获取appid
  //       const configDetails = provider.configDetails || {};
  //       // 明确类型检查
  //       if (!configDetails || typeof configDetails !== 'object') {
  //         throw new BadRequestException(
  //           'Onbuka配置不完整: configDetails必须是对象',
  //         );
  //       }

  //       // 使用类型断言并检查，而不是直接赋值
  //       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //       const appidRaw = configDetails.appid;
  //       // 显式类型检查
  //       if (typeof appidRaw !== 'string' || !appidRaw) {
  //         throw new BadRequestException(
  //           'Onbuka配置不完整: appid必须是非空字符串',
  //         );
  //       }

  //       // 此时appidRaw已经通过类型检查，可以安全地作为字符串使用
  //       return this.validateOnbukaCredentials(
  //         provider.apiKey,
  //         provider.apiSecret,
  //         appidRaw,
  //       );
  //     }
  //     default:
  //       throw new BadRequestException(`不支持的供应商类型: ${provider.name}`);
  //   }
  // }

  // 验证Onbuka凭证
  private async validateOnbukaCredentials(
    apiKey: string,
    apiSecret: string, // apiSecret在generateOnbukaHeaders中使用，但ESLint认为它未使用
    appid: string,
  ): Promise<boolean> {
    if (!apiKey || !apiSecret || !appid) {
      throw new BadRequestException(
        'Onbuka配置不完整: 需要apiKey, apiSecret和appid',
      );
    }

    try {
      const headers = this.generateOnbukaHeaders(apiKey, apiSecret);
      const url = `https://api.onbuka.com/v3/getBalance?appid=${appid}`;

      const response = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );

      // 检查响应状态
      const responseData = response.data as {
        status?: string;
        reason?: string;
      };

      if (responseData && responseData.status !== '-1') {
        return true;
      } else {
        throw new BadRequestException(
          'Onbuka凭证验证失败: 无效的API密钥或密钥密文',
        );
      }
    } catch (error: unknown) {
      const typedError = error as {
        response?: {
          data?: {
            status?: string;
            reason?: string;
          };
        };
        message?: string;
      };

      if (typedError.response && typedError.response.data) {
        const status = typedError.response.data.status;
        if (status === '-24') {
          return true;
        }
        throw new BadRequestException(
          `Onbuka凭证验证失败: ${typedError.response.data.reason || '未知错误'}`,
        );
      }

      throw new BadRequestException(
        `Onbuka凭证验证失败: ${typedError.message || '网络错误'}`,
      );
    }
  }

  // 生成Onbuka API认证头
  private generateOnbukaHeaders(
    apiKey: string,
    apiSecret: string,
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // 根据文档生成签名: API Key + API Secret + Timestamp
    const sign = createHash('md5')
      .update(`${apiKey}${apiSecret}${timestamp}`)
      .digest('hex');

    return {
      'Content-Type': 'application/json;charset=UTF-8',
      Sign: sign,
      Timestamp: timestamp,
      'Api-Key': apiKey,
    };
  }

  // 在适当位置添加findAllByTenant方法
  async findAllByTenant(
    tenantId: number,
    onlyActive = true,
  ): Promise<SmsProvider[]> {
    try {
      return await this.smsProviderRepository.find({
        where: onlyActive ? { isActive: true, tenantId } : { tenantId },
        order: { name: 'ASC' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding SMS providers for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
