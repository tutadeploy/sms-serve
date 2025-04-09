import {
  Controller,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from '../user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

interface RequestWithUser {
  user: {
    id: number;
    username: string;
  };
}

@ApiTags('用户：个人信息')
@Controller('system/user/profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserProfileController {
  constructor(private readonly userService: UserService) {}

  @Get('get')
  @ApiOperation({ summary: '获取个人信息' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            nickname: { type: 'string' },
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                },
              },
            },
            email: { type: 'string' },
            mobile: { type: 'string' },
            sex: { type: 'number' },
            avatar: { type: 'string' },
            status: { type: 'number' },
            remark: { type: 'string' },
            loginIp: { type: 'string' },
            loginDate: { type: 'string', format: 'date-time' },
            createTime: { type: 'string', format: 'date-time' },
          },
        },
        msg: { type: 'string', example: '获取成功' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: RequestWithUser) {
    return this.userService.getUserProfile(req.user.id);
  }
}
