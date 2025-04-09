import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponse {
  @ApiProperty({
    description: 'HTTP 状态码',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: '错误消息',
    example: '用户名或密码错误',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  @ApiProperty({
    description: '错误发生的时间戳',
    example: '2024-04-06T12:34:56.789Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '请求路径',
    example: '/v1/system/auth/login',
  })
  path: string;

  @ApiProperty({
    description: 'HTTP 请求方法',
    example: 'POST',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  })
  method: string;

  @ApiProperty({
    description: '错误代码（可选）',
    example: 'AUTH_INVALID_CREDENTIALS',
    required: false,
  })
  errorCode?: string;

  @ApiProperty({
    description: '详细错误信息（可选）',
    example: {
      field: 'username',
      constraint: 'isNotEmpty',
      message: '用户名不能为空',
    },
    required: false,
    additionalProperties: true,
  })
  details?: Record<string, any>;
}
