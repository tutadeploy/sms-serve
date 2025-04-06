import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { SsoSession } from './entities/sso-session.entity';
import { UserToken } from '../auth/entities/user-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SsoSession, UserToken])],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}
