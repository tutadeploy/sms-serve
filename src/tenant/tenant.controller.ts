import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Tenant } from './entities/tenant.entity';

@ApiTags('租户管理')
@Controller()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('tenant')
  @ApiOperation({ summary: '创建租户' })
  @ApiResponse({ status: 201, description: '租户创建成功', type: Tenant })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get('tenant')
  @ApiOperation({ summary: '获取所有租户' })
  @ApiResponse({ status: 200, description: '获取租户列表成功', type: [Tenant] })
  findAll() {
    return this.tenantService.findAll();
  }

  @Get('tenant/:id')
  @ApiOperation({ summary: '根据ID查询租户' })
  @ApiParam({ name: 'id', description: '租户ID', type: Number })
  @ApiResponse({ status: 200, description: '获取租户信息成功', type: Tenant })
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(+id);
  }

  @Patch('tenant/:id')
  @ApiOperation({ summary: '更新租户信息' })
  @ApiParam({ name: 'id', description: '租户ID', type: Number })
  @ApiResponse({ status: 200, description: '更新租户信息成功', type: Tenant })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(+id, updateTenantDto);
  }

  @Delete('tenant/:id')
  @ApiOperation({ summary: '删除租户' })
  @ApiParam({ name: 'id', description: '租户ID', type: Number })
  @ApiResponse({ status: 204, description: '删除租户成功' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tenantService.remove(+id);
  }

  @Get('system/tenant/get-id-by-name')
  @ApiOperation({ summary: '根据租户名称获取租户ID' })
  @ApiQuery({ name: 'name', description: '租户名称', type: String })
  @ApiResponse({ status: 200, description: '租户ID', type: Number })
  getIdByName(@Query('name') name: string) {
    return this.tenantService.getIdByName(name);
  }

  @Get('system/tenant/get-by-website')
  @ApiOperation({ summary: '根据网站地址获取租户' })
  @ApiQuery({ name: 'website', description: '网站地址', type: String })
  @ApiResponse({ status: 200, description: '获取租户信息成功', type: Tenant })
  getByWebsite(@Query('website') website: string) {
    return this.tenantService.findByWebsite(website);
  }
}
