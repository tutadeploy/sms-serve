import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // 引入 HttpModule 用于 API 调用
import { ConfigModule } from '@nestjs/config'; // 引入 ConfigModule 读取配置
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsProviderOnbukaService } from './sms-provider-onbuka.service';
import { SmsProviderOnbukaController } from './sms-provider-onbuka.controller';
import { SmsProvider } from '../sms-provider/entities/sms-provider.entity';

@Module({
  imports: [
    HttpModule, // 导入 HttpModule
    ConfigModule, // 导入 ConfigModule
    TypeOrmModule.forFeature([SmsProvider]), // 导入SmsProvider实体
  ],
  providers: [SmsProviderOnbukaService],
  controllers: [SmsProviderOnbukaController], // 添加控制器处理回调
  exports: [SmsProviderOnbukaService], // 导出服务供 Dispatcher 使用
})
export class SmsProviderOnbukaModule {}
