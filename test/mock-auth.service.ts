import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './simplified-entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    // 查找用户，需要显式选择passwordHash字段
    const user = await this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'email', 'passwordHash', 'role', 'isActive'],
    });

    if (!user) return null;

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;

    // 返回不包含密码的用户对象
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      userId: user.id,
    };

    return {
      openId: this.jwtService.sign(payload),
    };
  }

  getProfile(user: any) {
    return user;
  }
}
