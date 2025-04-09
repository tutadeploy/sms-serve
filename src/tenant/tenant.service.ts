import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantNotFoundException } from '../common/exceptions/business.exception';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // 检查租户名称是否已存在
    const existingTenant = await this.tenantRepository.findOne({
      where: { name: createTenantDto.tenantname },
    });

    if (existingTenant) {
      throw new ConflictException('租户名称已存在');
    }

    // 创建新租户
    const tenant = this.tenantRepository.create({
      name: createTenantDto.tenantname,
      code: createTenantDto.tenantname.toLowerCase(),
      status: TenantStatus.ACTIVE,
    });

    const savedTenant = await this.tenantRepository.save(tenant);
    return savedTenant;
  }

  async findAll(): Promise<Tenant[]> {
    const tenants = await this.tenantRepository.find();
    return tenants;
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new TenantNotFoundException(`ID为${id}`);
    }
    return tenant;
  }

  async findByName(name: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { name } });
    if (!tenant) {
      throw new TenantNotFoundException(name);
    }
    return tenant;
  }

  async getIdByName(name: string): Promise<number> {
    const tenant = await this.tenantRepository.findOne({
      where: { name },
      select: ['id'],
    });
    if (!tenant) {
      throw new TenantNotFoundException(name);
    }
    return tenant.id;
  }

  async findByWebsite(website: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { website } });
    if (!tenant) {
      throw new TenantNotFoundException(`网站为${website}`);
    }
    return tenant;
  }

  async update(id: number, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    // 先检查是否存在，如果不存在会抛出异常
    await this.findOne(id);

    // 如果更新名称或编码，需检查唯一性
    if (updateTenantDto.name || updateTenantDto.code) {
      const duplicateTenant = await this.tenantRepository.findOne({
        where: [
          updateTenantDto.name ? { name: updateTenantDto.name } : {},
          updateTenantDto.code ? { code: updateTenantDto.code } : {},
        ],
      });

      if (duplicateTenant && duplicateTenant.id !== id) {
        throw new ConflictException('租户名称或编码已存在');
      }
    }

    await this.tenantRepository.update(id, updateTenantDto);
    const updatedTenant = await this.findOne(id);
    return updatedTenant;
  }

  async remove(id: number): Promise<void> {
    const result = await this.tenantRepository.delete(id);
    if (result.affected === 0) {
      throw new TenantNotFoundException(`ID为${id}`);
    }
  }
}
