import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
  Delete,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PkgformService } from './pkgform.service';
import { UpdateFormDto } from './dto/update-form.dto';
import { QueryFormDto } from './dto/query-form.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
  };
}

@ApiTags('包裹表单')
@Controller('pkgform')
@UseGuards(JwtAuthGuard)
export class PkgformController {
  constructor(private readonly pkgformService: PkgformService) {}

  @Public()
  @Post('update-form')
  @ApiOperation({ summary: '更新包裹表单' })
  @ApiResponse({ status: 201, description: '表单已更新' })
  async updateForm(@Body() updateFormDto: UpdateFormDto) {
    return this.pkgformService.updateForm(updateFormDto);
  }

  @Get('get-form')
  @ApiOperation({ summary: '获取用户的所有包裹表单' })
  @ApiResponse({
    status: 200,
    description: '获取表单成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            list: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'number' },
                  name: { type: 'string' },
                  address1: { type: 'string' },
                  address2: { type: 'string', nullable: true },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  postalCode: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  cardholder: { type: 'string' },
                  cardNumber: { type: 'string' },
                  expireDate: { type: 'string' },
                  cvv: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number', description: '总记录数' },
          },
        },
      },
    },
  })
  async getForm(
    @Req() req: AuthenticatedRequest,
    @Query() query: QueryFormDto,
  ) {
    return this.pkgformService.getForm(req.user.userId, query);
  }

  @Delete('delete-form/:id')
  @ApiOperation({ summary: '删除表单' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '表单不存在或无权限删除' })
  async deleteForm(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.pkgformService.deleteForm(req.user.userId, id);
  }
}
