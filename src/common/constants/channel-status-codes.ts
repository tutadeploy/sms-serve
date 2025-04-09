/**
 * 短信渠道状态码常量定义
 */

/**
 * Buka渠道状态码
 */
export const BukaStatusCodes = {
  SUCCESS: 0, // 成功
  AUTH_ERROR: -1, // 认证错误
  IP_RESTRICTED: -2, // IP访问受限
  SENSITIVE_CONTENT: -3, // 短信内容含有敏感字符
  EMPTY_CONTENT: -4, // 短信内容为空
  CONTENT_TOO_LONG: -5, // 短信内容过长
  NOT_TEMPLATE_SMS: -6, // 不是模板的短信
  TOO_MANY_NUMBERS: -7, // 号码个数过多
  EMPTY_NUMBER: -8, // 号码为空
  INVALID_NUMBER: -9, // 号码异常
  INSUFFICIENT_BALANCE: -10, // 客户余额不足，不能满足本次发送
  INVALID_SCHEDULE_TIME: -11, // 定时时间格式不对
  PLATFORM_ERROR: -12, // 由于平台的原因，批量提交出错，请与管理员联系
  USER_LOCKED: -13, // 用户被锁定
  INVALID_FIELD_OR_MSGID: -14, // Field为空或者查询msgid异常
  QUERY_TOO_FREQUENT: -15, // 查询过频繁
  TIMESTAMP_EXPIRED: -16, // timestamp expires
  EMPTY_TEMPLATE: -17, // 短信模板不能为空
  API_EXCEPTION: -18, // 接口异常
  CONTACT_SALES: -19, // 联系商务发送短信报价
  DATA_EXISTS: -20, // 数据已存在
  DATA_PROCESSING_ERROR: -21, // 数据过证异常
  INVALID_PARAMETER: -22, // 参数异常
  DATA_LIMIT: -23, // 数据上限
  DATA_NOT_FOUND: -24, // 数据不存在
  TIME_RANGE_EXCEEDED: -25, // 超出时间范围
  COST_FETCH_FAILED: -26, // 获取费用失败
  PERIOD_TOTAL_LIMIT: -27, // 周期内发送总数量限制
  PERIOD_NUMBER_FREQUENCY_LIMIT: -28, // 周期内向同号码发送的频繁限制
};

/**
 * Buka状态码解释映射
 */
export const BukaStatusMessages: Record<number, string> = {
  0: '成功',
  [-1]: '认证错误',
  [-2]: 'IP访问受限',
  [-3]: '短信内容含有敏感字符',
  [-4]: '短信内容为空',
  [-5]: '短信内容过长',
  [-6]: '不是模板的短信',
  [-7]: '号码个数过多',
  [-8]: '号码为空',
  [-9]: '号码异常',
  [-10]: '客户余额不足，不能满足本次发送',
  [-11]: '定时时间格式不对',
  [-12]: '由于平台的原因，批量提交出错，请与管理员联系',
  [-13]: '用户被锁定',
  [-14]: 'Field为空或者查询msgid异常',
  [-15]: '查询过频繁',
  [-16]: 'timestamp expires',
  [-17]: '短信模板不能为空',
  [-18]: '接口异常',
  [-19]: '联系商务发送短信报价',
  [-20]: '数据已存在',
  [-21]: '数据过证异常',
  [-22]: '参数异常',
  [-23]: '数据上限',
  [-24]: '数据不存在',
  [-25]: '超出时间范围',
  [-26]: '获取费用失败',
  [-27]: '周期内发送总数量限制',
  [-28]: '周期内向同号码发送的频繁限制',
};

/**
 * 获取Buka状态码对应的错误消息
 * @param code 状态码
 * @returns 状态码对应的错误消息，如果不存在则返回'未知错误'
 */
export function getBukaStatusMessage(code: number): string {
  return BukaStatusMessages[code] || '未知错误';
}

/**
 * 系统通用状态码
 */
export const SystemStatusCodes = {
  SUCCESS: 0, // 成功

  // 租户/用户相关错误 (1xxx)
  TENANT_EXISTS: 1001, // 租户名称已存在
  USER_EXISTS: 1002, // 用户名已存在
  TENANT_NOT_FOUND: 1003, // 租户不存在
  USER_NOT_FOUND: 1004, // 用户不存在

  // 模板相关错误 (2xxx)
  TEMPLATE_LIMIT_EXCEEDED: 2001, // 模板数量已达上限
  TEMPLATE_NOT_FOUND: 2002, // 模板不存在

  // 渠道配置相关错误 (3xxx)
  CHANNEL_UNSUPPORTED: 3001, // 渠道不支持
  USER_OR_TENANT_NOT_FOUND: 3002, // 用户或租户不存在

  // 国家支持相关错误 (4xxx)
  CHANNEL_NOT_FOUND: 4001, // 渠道不支持或不存在

  // 短信发送相关错误 (5xxx)
  CHANNEL_CONFIG_INCOMPLETE: 5001, // 渠道配置不完整

  // 批次查询相关错误 (6xxx)
  BATCH_NOT_FOUND: 6001, // 批次不存在
};

/**
 * 系统状态码解释映射
 */
export const SystemStatusMessages: Record<number, string> = {
  0: '成功',
  1001: '租户名称已存在',
  1002: '用户名已存在',
  1003: '租户不存在',
  1004: '用户不存在',
  2001: '模板数量已达上限(10个)',
  2002: '模板不存在',
  3001: '渠道不支持',
  3002: '用户或租户不存在',
  4001: '渠道不支持或不存在',
  5001: '渠道配置不完整',
  6001: '批次不存在',
};

/**
 * 获取系统状态码对应的错误消息
 * @param code 状态码
 * @returns 状态码对应的错误消息，如果不存在则返回'未知错误'
 */
export function getSystemStatusMessage(code: number): string {
  return SystemStatusMessages[code] || '未知错误';
}
