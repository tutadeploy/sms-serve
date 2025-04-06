import { Module, Global } from '@nestjs/common';
import { SmsDispatcherService } from './sms-dispatcher.service';
import { SmsTrackingModule } from '../sms-tracking/sms-tracking.module';
import { SmsProviderModule } from '../../src/sms-provider/sms-provider.module'; // 导入基础 Provider 模块
import { SmsProviderOnbukaModule } from '../sms-provider-onbuka/sms-provider-onbuka.module'; // 导入 Onbuka Provider 模块
// 导入其他 Provider 模块...
// import { SmsProviderAliyunModule } from '../sms-provider-aliyun/sms-provider-aliyun.module';

@Global() // 可选：如果希望在其他非导入模块中也能注入 SmsDispatcherService
@Module({
  imports: [
    SmsTrackingModule, // 需要访问数据库
    SmsProviderModule, // 需要访问基础 Provider 信息
    SmsProviderOnbukaModule, // 注入 Onbuka 服务
    // 导入其他 Provider 模块...
    // SmsProviderAliyunModule,
  ],
  providers: [SmsDispatcherService],
  exports: [SmsDispatcherService], // 导出服务供 SmsApiModule 使用
})
export class SmsDispatcherModule {}
