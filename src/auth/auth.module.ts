import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { User } from '../user/entities/user.entity';
import { UserToken } from './entities/user-token.entity';
import { TenantModule } from '../tenant/tenant.module';
import { SsoModule } from '../sso/sso.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'supersecret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION_TIME', '1h'),
          issuer: 'sms-serve',
        },
      }),
    }),
    TypeOrmModule.forFeature([User, UserToken]),
    TenantModule,
    SsoModule,
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshTokenGuard],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
