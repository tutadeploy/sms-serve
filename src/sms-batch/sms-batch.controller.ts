import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SmsBatchService } from './sms-batch.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { BatchStatusQueryDto } from './dto/batch-status-query.dto';
import { SmsBatch } from './entities/sms-batch.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('SMS批次管理')
@Controller('sms-batch')
export class SmsBatchController {
  constructor(private readonly smsBatchService: SmsBatchService) {}

  /**
   * 创建新批次
   * @param createBatchDto 批次创建信息
   * @returns 创建的批次
   */
  @Post()
  @ApiOperation({
    summary: '创建新短信批次',
    description: '创建一个新的短信发送批次，包含批次基本信息和接收者列表',
  })
  @ApiBody({ type: CreateBatchDto })
  @ApiResponse({
    status: 201,
    description: '批次创建成功',
    type: SmsBatch,
  })
  @ApiResponse({ status: 400, description: '参数错误' })
  async createBatch(@Body() createBatchDto: CreateBatchDto): Promise<SmsBatch> {
    return this.smsBatchService.createBatch(createBatchDto);
  }

  /**
   * 获取批次基本信息
   * @param id 批次ID
   * @returns 批次信息
   */
  @Get(':id')
  @ApiOperation({
    summary: '获取批次基本信息',
    description: '根据批次ID获取批次的详细信息',
  })
  @ApiParam({
    name: 'id',
    description: '批次ID',
    type: Number,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取批次信息',
    type: SmsBatch,
  })
  @ApiResponse({ status: 404, description: '批次不存在' })
  async getBatchInfo(@Param('id') id: number): Promise<SmsBatch> {
    return this.smsBatchService.getBatchInfo(id);
  }

  /**
   * 获取批次中消息的实时状态
   * @param query 查询参数
   * @returns 批次状态
   */
  @Get('status')
  @ApiOperation({
    summary: '获取批次消息状态',
    description:
      '获取批次中所有消息的实时状态，包括发送成功、失败、发送中的数量统计',
  })
  @ApiQuery({
    name: 'batchId',
    description: '批次ID',
    type: Number,
    required: true,
  })
  @ApiQuery({
    name: 'tenantId',
    description: '租户ID',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'userId',
    description: '用户ID',
    type: Number,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取批次状态',
    schema: {
      type: 'object',
      properties: {
        batchInfo: {
          type: 'object',
          $ref: '#/components/schemas/SmsBatch',
        },
        messageStatus: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  messageId: { type: 'string' },
                  recipientNumber: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['delivered', 'sending', 'failed', 'unknown'],
                  },
                  sendTime: { type: 'string', format: 'date-time' },
                },
              },
            },
            totalSuccess: { type: 'number' },
            totalFail: { type: 'number' },
            totalSending: { type: 'number' },
            totalNotFound: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: '批次不存在或无权访问' })
  async getBatchMessageStatus(@Query() query: BatchStatusQueryDto): Promise<{
    batchInfo: SmsBatch;
    messageStatus: {
      results: Array<{
        messageId: string;
        recipientNumber: string;
        status: 'delivered' | 'sending' | 'failed' | 'unknown';
        sendTime?: Date;
      }>;
      totalSuccess: number;
      totalFail: number;
      totalSending: number;
      totalNotFound: number;
    };
  }> {
    return this.smsBatchService.getBatchMessageStatus(
      query.batchId,
      query.tenantId || 1, // 默认租户ID为1
      query.userId || 1, // 默认用户ID为1
    );
  }
}
