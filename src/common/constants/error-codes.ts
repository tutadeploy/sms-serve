/**
 * 系统错误码定义
 * 错误码格式：ABBCC
 * A：错误类型
 *   1 - 系统级错误
 *   2 - 业务级错误
 * BB：模块编号
 *   00 - 系统通用
 *   01 - 认证授权
 *   02 - 用户管理
 *   03 - 租户管理
 *   04 - 短信服务
 * CC：具体错误编号
 */
export const ErrorCode = {
  // 系统级错误 (10000-19999)
  SYSTEM: {
    UNKNOWN: 10000, // 未知错误
    NETWORK: 10001, // 网络错误
    DATABASE: 10002, // 数据库错误
    CACHE: 10003, // 缓存错误
    CONFIG: 10004, // 配置错误
    VALIDATION: 10005, // 参数验证错误
  },

  // 认证授权错误 (20100-20199)
  AUTH: {
    UNAUTHORIZED: 20100, // 未认证
    INVALID_TOKEN: 20101, // 无效的访问令牌
    EXPIRED_TOKEN: 20102, // 令牌已过期
    INVALID_REFRESH_TOKEN: 20103, // 无效的刷新令牌
    EXPIRED_REFRESH_TOKEN: 20104, // 刷新令牌已过期
    INVALID_CREDENTIALS: 20105, // 用户名或密码错误
    ACCOUNT_DISABLED: 20106, // 账号已禁用
    PERMISSION_DENIED: 20107, // 权限不足
    INVALID_CAPTCHA: 20108, // 验证码错误
    TOKEN_REVOKED: 20109, // 令牌已被撤销
  },

  // 用户管理错误 (20200-20299)
  USER: {
    NOT_FOUND: 20200, // 用户不存在
    ALREADY_EXISTS: 20201, // 用户已存在
    INVALID_PASSWORD: 20202, // 密码不符合要求
    INVALID_EMAIL: 20203, // 邮箱格式错误
    INVALID_PHONE: 20204, // 手机号格式错误
    PASSWORD_EXPIRED: 20205, // 密码已过期
    TOO_MANY_ATTEMPTS: 20206, // 尝试次数过多
  },

  // 租户管理错误 (20300-20399)
  TENANT: {
    NOT_FOUND: 20300, // 租户不存在
    ALREADY_EXISTS: 20301, // 租户已存在
    DISABLED: 20302, // 租户已禁用
    EXPIRED: 20303, // 租户已过期
    QUOTA_EXCEEDED: 20304, // 配额超限
  },

  // 短信服务错误 (20400-20499)
  SMS: {
    SEND_FAILED: 20400, // 发送失败
    INVALID_TEMPLATE: 20401, // 无效的模板
    TEMPLATE_NOT_FOUND: 20402, // 模板不存在
    CHANNEL_ERROR: 20403, // 通道错误
    RATE_LIMIT: 20404, // 发送频率限制
    BALANCE_INSUFFICIENT: 20405, // 余额不足
    INVALID_SIGNATURE: 20406, // 签名无效
    BLACKLIST: 20407, // 黑名单限制
  },
} as const;

// 错误码对应的默认错误消息
export const ErrorMessage: Record<number, string> = {
  // 系统级错误
  [ErrorCode.SYSTEM.UNKNOWN]: '系统错误',
  [ErrorCode.SYSTEM.NETWORK]: '网络错误',
  [ErrorCode.SYSTEM.DATABASE]: '数据库错误',
  [ErrorCode.SYSTEM.CACHE]: '缓存错误',
  [ErrorCode.SYSTEM.CONFIG]: '配置错误',
  [ErrorCode.SYSTEM.VALIDATION]: '参数验证错误',

  // 认证授权错误
  [ErrorCode.AUTH.UNAUTHORIZED]: '未认证',
  [ErrorCode.AUTH.INVALID_TOKEN]: '无效的访问令牌',
  [ErrorCode.AUTH.EXPIRED_TOKEN]: '令牌已过期',
  [ErrorCode.AUTH.INVALID_REFRESH_TOKEN]: '无效的刷新令牌',
  [ErrorCode.AUTH.EXPIRED_REFRESH_TOKEN]: '刷新令牌已过期',
  [ErrorCode.AUTH.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.AUTH.ACCOUNT_DISABLED]: '账号已禁用',
  [ErrorCode.AUTH.PERMISSION_DENIED]: '权限不足',
  [ErrorCode.AUTH.INVALID_CAPTCHA]: '验证码错误',
  [ErrorCode.AUTH.TOKEN_REVOKED]: '令牌已被撤销',

  // 用户管理错误
  [ErrorCode.USER.NOT_FOUND]: '用户不存在',
  [ErrorCode.USER.ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.USER.INVALID_PASSWORD]: '密码不符合要求',
  [ErrorCode.USER.INVALID_EMAIL]: '邮箱格式错误',
  [ErrorCode.USER.INVALID_PHONE]: '手机号格式错误',
  [ErrorCode.USER.PASSWORD_EXPIRED]: '密码已过期',
  [ErrorCode.USER.TOO_MANY_ATTEMPTS]: '尝试次数过多',

  // 租户管理错误
  [ErrorCode.TENANT.NOT_FOUND]: '租户不存在',
  [ErrorCode.TENANT.ALREADY_EXISTS]: '租户已存在',
  [ErrorCode.TENANT.DISABLED]: '租户已禁用',
  [ErrorCode.TENANT.EXPIRED]: '租户已过期',
  [ErrorCode.TENANT.QUOTA_EXCEEDED]: '配额超限',

  // 短信服务错误
  [ErrorCode.SMS.SEND_FAILED]: '短信发送失败',
  [ErrorCode.SMS.INVALID_TEMPLATE]: '无效的短信模板',
  [ErrorCode.SMS.TEMPLATE_NOT_FOUND]: '短信模板不存在',
  [ErrorCode.SMS.CHANNEL_ERROR]: '短信通道错误',
  [ErrorCode.SMS.RATE_LIMIT]: '发送频率超限',
  [ErrorCode.SMS.BALANCE_INSUFFICIENT]: '短信余额不足',
  [ErrorCode.SMS.INVALID_SIGNATURE]: '短信签名无效',
  [ErrorCode.SMS.BLACKLIST]: '号码在黑名单中',
};
