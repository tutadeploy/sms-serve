import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: number;
  username: string;
  role: string;
  userId: number;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'test-jwt-secret', // 使用测试环境的密钥
    });
  }

  async validate(payload: JwtPayload) {
    // 基于JWT载荷中的信息返回用户对象
    return {
      userId: payload.userId || payload.sub,
      username: payload.username,
      role: payload.role || 'user',
    };
  }
}
