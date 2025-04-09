import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsBatch } from './entities/sms-batch.entity';
import { SmsBatchBukaDetail } from './entities/sms-batch-buka-detail.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { BukaService } from '../sms-provider/buka/buka.service';

@Injectable()
export class SmsBatchService {
  private readonly logger = new Logger(SmsBatchService.name);

  constructor(
    @InjectRepository(SmsBatch)
    private readonly batchRepository: Repository<SmsBatch>,

    @InjectRepository(SmsBatchBukaDetail)
    private readonly bukaDetailRepository: Repository<SmsBatchBukaDetail>,

    private readonly bukaService: BukaService,
  ) {}

  /**
   * 创建新批次
   * @param createBatchDto 批次创建信息
   * @returns 创建的批次
   */
  async createBatch(createBatchDto: CreateBatchDto): Promise<SmsBatch> {
    const { tenantId, userId, channel, content, recipients } = createBatchDto;

    // 创建批次基本信息
    const batch = this.batchRepository.create({
      tenantId,
      userId,
      channel,
      content,
      status: 'pending',
      totalCount: recipients.length,
      createdAt: new Date(),
    });

    // 保存批次
    const savedBatch = await this.batchRepository.save(batch);
    this.logger.log(
      `创建批次成功: ID=${savedBatch.id}, 渠道=${channel}, 总数=${recipients.length}`,
    );

    // 如果是Buka渠道，处理详情
    if (channel === 'onbuka') {
      await this.processBukaBatch(savedBatch, recipients);
    }
    // 其他渠道处理可在此扩展

    return savedBatch;
  }

  /**
   * 处理Buka渠道批次
   * @param batch 批次信息
   * @param recipients 接收者列表
   */
  private async processBukaBatch(
    batch: SmsBatch,
    recipients: string[],
  ): Promise<void> {
    try {
      // 1. 为每个接收者创建详情记录
      const bukaDetails: SmsBatchBukaDetail[] = [];

      for (let i = 0; i < recipients.length; i++) {
        const messageId = Date.now() + i; // 简单生成唯一ID
        const orderId = `${batch.id}_${messageId}`; // 组合订单ID

        const detail = this.bukaDetailRepository.create({
          batchId: batch.id,
          messageId,
          orderId,
          recipientNumber: recipients[i],
          status: 'pending',
        });

        bukaDetails.push(detail);
      }

      // 批量保存详情
      await this.bukaDetailRepository.save(bukaDetails);
      this.logger.log(`已创建${bukaDetails.length}条Buka批次详情记录`);

      // 2. 准备发送SMS参数
      const messages = bukaDetails.map((detail) => ({
        id: detail.messageId,
        recipientNumber: detail.recipientNumber,
      }));

      // 3. 调用BukaService发送短信
      const sendResult = await this.bukaService.sendSmsBatch(
        messages,
        batch.content,
        batch.tenantId,
        batch.userId,
      );

      // 4. 更新批次状态
      batch.status = 'submitted';
      batch.successCount = sendResult.submitted.length;
      batch.failedCount = sendResult.failed.length;
      await this.batchRepository.save(batch);

      // 5. 更新详情状态
      // 处理成功提交的消息
      if (sendResult.submitted.length > 0) {
        const submitUpdates = sendResult.submitted.map(async (item) => {
          const detail = bukaDetails.find((d) => d.messageId === item.id);
          if (detail) {
            detail.providerMessageId = item.providerMessageId || '';
            detail.status = 'submitted';
            return this.bukaDetailRepository.save(detail);
          }
        });

        await Promise.all(submitUpdates);
      }

      // 处理失败的消息
      if (sendResult.failed.length > 0) {
        const failUpdates = sendResult.failed.map(async (item) => {
          const detail = bukaDetails.find((d) => d.messageId === item.id);
          if (detail) {
            detail.status = 'failed';
            return this.bukaDetailRepository.save(detail);
          }
        });

        await Promise.all(failUpdates);
      }

      this.logger.log(
        `Buka批次处理完成: 成功=${sendResult.submitted.length}, 失败=${sendResult.failed.length}`,
      );
    } catch (error) {
      // 发生错误时将批次状态更新为失败
      batch.status = 'failed';
      batch.reason = error instanceof Error ? error.message : String(error);
      await this.batchRepository.save(batch);

      this.logger.error(
        `Buka批次处理失败: ${batch.reason}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 获取批次基本信息
   * @param batchId 批次ID
   * @returns 批次信息
   */
  async getBatchInfo(batchId: number): Promise<SmsBatch> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
      relations: ['user', 'tenant'],
    });

    if (!batch) {
      throw new NotFoundException(`ID为${batchId}的批次不存在`);
    }

    return batch;
  }

  /**
   * 获取批次中消息的实时状态
   * @param batchId 批次ID
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @returns 批次状态
   */
  async getBatchMessageStatus(
    batchId: number,
    tenantId: number,
    userId: number,
  ): Promise<{
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
    // 1. 获取批次信息
    const batch = await this.getBatchInfo(batchId);

    // 验证批次所属
    if (batch.tenantId !== tenantId) {
      throw new NotFoundException(`租户${tenantId}无权访问批次${batchId}`);
    }

    // 2. 根据渠道查询状态
    if (batch.channel === 'onbuka') {
      // 获取Buka详情
      const bukaDetails = await this.bukaDetailRepository.find({
        where: { batchId },
      });

      // 提取msgIds
      const msgIds = bukaDetails
        .filter((d) => d.providerMessageId)
        .map((d) => d.providerMessageId);

      if (msgIds.length === 0) {
        return {
          batchInfo: batch,
          messageStatus: {
            results: [],
            totalSuccess: 0,
            totalFail: 0,
            totalSending: 0,
            totalNotFound: 0,
          },
        };
      }

      // 调用Buka查询API
      const messageStatus = await this.bukaService.queryMessageStatusByIds(
        msgIds,
        tenantId,
        userId,
      );

      return {
        batchInfo: batch,
        messageStatus,
      };
    }

    // 3. 其他渠道处理...
    throw new NotFoundException(`不支持的渠道: ${batch.channel}`);
  }
}
