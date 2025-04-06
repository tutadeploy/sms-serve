import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常错误代码枚举
 */
export enum BusinessErrorCode {
  // 通用错误
  GENERAL_ERROR = 1000,

  // 用户相关错误 1100-1199
  USER_NOT_FOUND = 1100,
  USER_ALREADY_EXISTS = 1101,
  INVALID_CREDENTIALS = 1102,

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

  // 权限相关错误 1500-1599
  PERMISSION_DENIED = 1500,

  // 第三方服务错误 1600-1699
  THIRD_PARTY_SERVICE_ERROR = 1600,
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
