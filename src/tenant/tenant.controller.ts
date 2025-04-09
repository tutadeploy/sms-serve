import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  SetMetadata,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { Tenant, TenantStatus } from './entities/tenant.entity';

@ApiTags('租户管理')
@ApiBearerAuth()
@Controller('system/tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @SetMetadata('isPublic', true)
  @Post('create')
  @ApiOperation({ summary: '创建租户' })
  @ApiResponse({
    status: 201,
    description: '租户创建成功',
    type: TenantResponseDto,
  })
  async create(
    @Body() createTenantDto: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.tenantService.create(createTenantDto);
    return this.transformToResponseDto(tenant);
  }

  @Get('list')
  @ApiOperation({ summary: '获取所有租户 (建议使用分页)' })
  @ApiResponse({
    status: 200,
    description: '获取租户列表成功',
    type: [TenantResponseDto],
  })
  async findAll(): Promise<TenantResponseDto[]> {
    const tenants = await this.tenantService.findAll();
    return tenants.map((tenant) => this.transformToResponseDto(tenant));
  }

  @Get('get')
  @ApiOperation({ summary: '根据ID查询租户' })
  @ApiQuery({ name: 'id', description: '租户ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '获取租户信息成功',
    type: TenantResponseDto,
  })
  async findOne(
    @Query('id', ParseIntPipe) id: number,
  ): Promise<TenantResponseDto> {
    const tenant = await this.tenantService.findOne(id);
    return this.transformToResponseDto(tenant);
  }

  @Put('update')
  @ApiOperation({ summary: '更新租户信息' })
  @ApiQuery({ name: 'id', description: '租户ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '更新租户信息成功',
    type: TenantResponseDto,
  })
  async update(
    @Query('id', ParseIntPipe) id: number,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.tenantService.update(id, updateTenantDto);
    return this.transformToResponseDto(tenant);
  }

  @Delete('delete')
  @ApiOperation({ summary: '删除租户' })
  @ApiQuery({ name: 'id', description: '租户ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '删除租户成功',
    schema: { example: {} },
  })
  @HttpCode(HttpStatus.OK)
  async remove(@Query('id', ParseIntPipe) id: number): Promise<void> {
    await this.tenantService.remove(id);
  }

  @Get('get-id-by-name')
  @ApiOperation({ summary: '根据租户名称获取租户ID' })
  @ApiQuery({ name: 'name', description: '租户名称', type: String })
  @ApiResponse({
    status: 200,
    description: '租户ID',
    schema: { type: 'number' },
  })
  async getIdByName(@Query('name') name: string): Promise<number> {
    return await this.tenantService.getIdByName(name);
  }

  @Get('get-by-website')
  @ApiOperation({ summary: '根据网站地址获取租户' })
  @ApiQuery({ name: 'website', description: '网站地址', type: String })
  @ApiResponse({
    status: 200,
    description: '获取租户信息成功',
    type: TenantResponseDto,
  })
  async getByWebsite(
    @Query('website') website: string,
  ): Promise<TenantResponseDto> {
    const tenant = await this.tenantService.findByWebsite(website);
    return this.transformToResponseDto(tenant);
  }

  /**
   * 将 Tenant 实体转换为 TenantResponseDto
   */
  private transformToResponseDto(tenant: Tenant): TenantResponseDto {
    const plainTenant = tenant as unknown as {
      id: number;
      name: string;
      code: string;
      website?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      logoUrl?: string | null;
      status: TenantStatus;
      expirationDate?: Date | null;
      createTime: Date;
      updateTime: Date;
    };

    return new TenantResponseDto({
      id: plainTenant.id,
      name: plainTenant.name,
      code: plainTenant.code,
      website: plainTenant.website,
      contactEmail: plainTenant.contactEmail,
      contactPhone: plainTenant.contactPhone,
      logoUrl: plainTenant.logoUrl,
      status: plainTenant.status,
      expirationDate: plainTenant.expirationDate,
      createTime: plainTenant.createTime,
      updateTime: plainTenant.updateTime,
    });
  }
}
