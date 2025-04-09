import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常错误代码枚举
 */
export enum BusinessErrorCode {
  // 通用错误
  GENERAL_ERROR = 1000,
  MISSING_REQUIRED_PARAMS = 1001,

  // 用户相关错误 1100-1199
  USER_NOT_FOUND = 1100,
  USER_ALREADY_EXISTS = 1101,
  INVALID_CREDENTIALS = 1102,
  USER_TENANT_MISMATCH = 1103,
  USER_NO_TENANT = 1104,

  // 租户相关错误 1150-1199
  TENANT_NOT_FOUND = 1150,
  TENANT_ALREADY_EXISTS = 1151,

  // 账户相关错误 1200-1299
  ACCOUNT_NOT_FOUND = 1200,
  INSUFFICIENT_BALANCE = 1201,

  // 短信相关错误 1300-1399
  SMS_PROVIDER_NOT_FOUND = 1300,
  SMS_TEMPLATE_NOT_FOUND = 1301,
  SMS_BATCH_NOT_FOUND = 1302,
  SMS_MESSAGE_NOT_FOUND = 1303,
  INVALID_PHONE_NUMBER = 1304,
  SMS_SEND_FAILED = 1305,

  // 邮件相关错误 1350-1399
  EMAIL_TEMPLATE_NOT_FOUND = 1350,
  EMAIL_BATCH_NOT_FOUND = 1351,
  EMAIL_MESSAGE_NOT_FOUND = 1352,
  INVALID_EMAIL_ADDRESS = 1353,
  EMAIL_SEND_FAILED = 1354,

  // 模板相关错误 1400-1499
  TEMPLATE_NOT_FOUND = 1400,
  TEMPLATE_RENDER_ERROR = 1401,
  TEMPLATE_LIMIT_EXCEEDED = 1402,

  // 权限相关错误 1500-1599
  PERMISSION_DENIED = 1500,

  // 渠道相关错误 1700-1799
  CHANNEL_CONFIG_ERROR = 1700,
  CHANNEL_NOT_FOUND = 1701,
  CHANNEL_SUPPORT_ERROR = 1702,
  CHANNEL_VALIDATION_ERROR = 1703,

  // 第三方服务错误 1600-1699
  THIRD_PARTY_SERVICE_ERROR = 1600,

  // 新增错误码
  INVALID_COUNTRY_CODE = 10004,
}

/**
 * 业务异常类
 * 用于表示业务逻辑错误，与系统错误区分开
 */
export class BusinessException extends HttpException {
  /**
   * 业务错误代码
   */
  private readonly errorCode: BusinessErrorCode;

  /**
   * 构造函数
   * @param message 错误消息
   * @param errorCode 业务错误代码
   * @param statusCode HTTP状态码，默认为400(Bad Request)
   */
  constructor(
    message: string,
    errorCode: BusinessErrorCode,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        message,
        errorCode,
        statusCode,
        error: 'Business Error',
      },
      statusCode,
    );
    this.errorCode = errorCode;
  }

  /**
   * 获取业务错误代码
   */
  getErrorCode(): BusinessErrorCode {
    return this.errorCode;
  }
}

export class TenantNotFoundException extends BusinessException {
  constructor(identifier: string) {
    super(`租户 ${identifier} 不存在`, BusinessErrorCode.TENANT_NOT_FOUND);
  }
}
