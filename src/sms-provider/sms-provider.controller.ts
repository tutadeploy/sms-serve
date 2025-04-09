import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Logger,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
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
    this.logger.log(
      `创建新供应商配置: ${createProviderDto.name} 为租户 ${createProviderDto.tenantId}`,
    );
    return this.smsProviderService.create(createProviderDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有短信供应商配置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll() {
    return this.smsProviderService.findAll();
  }

  // 新增按租户获取供应商列表方法
  @Get('by-tenant/:tenantId')
  @ApiOperation({ summary: '获取租户的短信供应商配置列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiParam({ name: 'tenantId', description: '租户ID' })
  async getProvidersByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Query('onlyActive', new DefaultValuePipe(true), ParseBoolPipe)
    onlyActive: boolean,
  ) {
    return this.smsProviderService.findAllByTenant(tenantId, onlyActive);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个短信供应商配置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '供应商不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.smsProviderService.findOne(id);
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
