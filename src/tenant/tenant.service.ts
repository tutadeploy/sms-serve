import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // 检查名称或编码是否已存在
    const existingTenant = await this.tenantRepository.findOne({
      where: [{ name: createTenantDto.name }, { code: createTenantDto.code }],
    });

    if (existingTenant) {
      throw new ConflictException('租户名称或编码已存在');
    }

    const tenant = this.tenantRepository.create(createTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find();
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`ID为${id}的租户不存在`);
    }
    return tenant;
  }

  async findByName(name: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { name } });
    if (!tenant) {
      throw new NotFoundException(`名称为${name}的租户不存在`);
    }
    return tenant;
  }

  async getIdByName(name: string): Promise<number> {
    const tenant = await this.tenantRepository.findOne({
      where: { name },
      select: ['id'],
    });
    if (!tenant) {
      throw new NotFoundException(`名称为${name}的租户不存在`);
    }
    return tenant.id;
  }

  async findByWebsite(website: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { website } });
    if (!tenant) {
      throw new NotFoundException(`网站为${website}的租户不存在`);
    }
    return tenant;
  }

  async update(id: number, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    // 先检查是否存在
    await this.findOne(id);

    // 如果更新名称或编码，需检查唯一性
    if (updateTenantDto.name || updateTenantDto.code) {
      const existingTenant = await this.tenantRepository.findOne({
        where: [
          updateTenantDto.name ? { name: updateTenantDto.name } : {},
          updateTenantDto.code ? { code: updateTenantDto.code } : {},
        ],
      });

      if (existingTenant && existingTenant.id !== id) {
        throw new ConflictException('租户名称或编码已存在');
      }
    }

    await this.tenantRepository.update(id, updateTenantDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.tenantRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`ID为${id}的租户不存在`);
    }
  }
}
