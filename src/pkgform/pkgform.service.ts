import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { PackageForm } from './entities/package-form.entity';
import { UpdateFormDto } from './dto/update-form.dto';
import { QueryFormDto } from './dto/query-form.dto';
import { User } from '../user/entities/user.entity';
import * as crypto from 'crypto';

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
    const [ivHex, encryptedHex] = text.split(':');
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

    return this.packageFormRepository.save(packageForm);
  }

  async getForm(userId: number, query: QueryFormDto) {
    const {
      createTime,
      endCreateTime,
      updateTime,
      endUpdateTime,
      pageNo = 1,
      pageSize = 10,
      sort = 'DESC',
    } = query;

    // 构建查询条件
    const where: FindOptionsWhere<PackageForm> = { userId };

    if (createTime && endCreateTime) {
      where.createdAt = Between(new Date(createTime), new Date(endCreateTime));
    }

    if (updateTime && endUpdateTime) {
      where.updatedAt = Between(new Date(updateTime), new Date(endUpdateTime));
    }

    // 查询总数
    const total = await this.packageFormRepository.count({ where });

    // 查询数据
    const forms = await this.packageFormRepository.find({
      where,
      order: { createdAt: sort },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

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
    const form = await this.packageFormRepository.findOne({
      where: { id: Number(formId), userId },
    });

    if (!form) {
      throw new NotFoundException('表单不存在或无权限删除');
    }

    await this.packageFormRepository.remove(form);
    return { success: true };
  }
}
