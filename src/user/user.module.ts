import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { TenantModule } from '../tenant/tenant.module';
import { Role } from '../auth/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { UserProfileController } from './controllers/user.profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission]), TenantModule],
  controllers: [UserController, UserProfileController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
