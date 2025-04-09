import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PkgformController } from './pkgform.controller';
import { PkgformService } from './pkgform.service';
import { PackageForm } from './entities/package-form.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PackageForm, User])],
  controllers: [PkgformController],
  providers: [PkgformService],
  exports: [PkgformService],
})
export class PkgformModule {}
