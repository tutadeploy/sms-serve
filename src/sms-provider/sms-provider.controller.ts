import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SmsProviderService } from './sms-provider.service';
import { CreateSmsProviderDto } from './dto/create-sms-provider.dto';
import { UpdateSmsProviderDto } from './dto/update-sms-provider.dto';

@ApiTags('sms-provider')
@Controller('sms-provider')
export class SmsProviderController {
  private readonly logger = new Logger(SmsProviderController.name);

  constructor(private readonly smsProviderService: SmsProviderService) {}

  @Post()
  @ApiOperation({ summary: '创建新的短信供应商配置' })
  @ApiResponse({ status: 201, description: '供应商配置已创建' })
  @ApiResponse({ status: 400, description: '参数错误或验证失败' })
  @ApiResponse({ status: 401, description: '未授权' })
  async createProvider(@Body() createProviderDto: CreateSmsProviderDto) {
    this.logger.log(`创建新供应商配置: ${createProviderDto.name}`);
    return this.smsProviderService.create(createProviderDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有短信供应商配置列表' })
  @ApiResponse({ status: 200, description: '返回供应商列表' })
  async getAllProviders() {
    this.logger.log('获取所有供应商配置列表');
    return this.smsProviderService.findAllWithoutSecrets();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定ID的短信供应商配置' })
  @ApiResponse({ status: 200, description: '返回供应商配置' })
  @ApiResponse({ status: 404, description: '供应商不存在' })
  async getProvider(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`获取供应商配置 ID: ${id}`);
    const provider = await this.smsProviderService.findOneWithoutSecrets(id);
    if (!provider) {
      this.logger.warn(`未找到ID为${id}的供应商`);
      return null; // 控制器层不抛出异常，由服务层处理
    }
    return provider;
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新短信供应商配置' })
  @ApiResponse({ status: 200, description: '供应商配置已更新' })
  @ApiResponse({ status: 400, description: '参数错误或验证失败' })
  @ApiResponse({ status: 404, description: '供应商不存在' })
  async updateProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProviderDto: UpdateSmsProviderDto,
  ) {
    this.logger.log(`更新供应商配置 ID: ${id}`);
    return this.smsProviderService.update(id, updateProviderDto);
  }
}
