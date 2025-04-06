import { Test, TestingModule } from '@nestjs/testing';
import { SmsProcessor } from './sms.processor';
import { SmsService } from './sms.service';
import { Job } from 'bull';

describe('SmsProcessor', () => {
  let processor: SmsProcessor;
  let smsService: any;

  beforeEach(async () => {
    // 创建mock对象
    smsService = {
      sendSingleSms: jest.fn().mockResolvedValue(undefined),
      updateSmsMessageStatus: jest.fn().mockResolvedValue(undefined),
      isBatchProcessingComplete: jest.fn().mockResolvedValue(false),
      finalizeBatchStatus: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsProcessor,
        {
          provide: SmsService,
          useValue: smsService,
        },
      ],
    }).compile();

    processor = module.get<SmsProcessor>(SmsProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleSmsSend', () => {
    it('should process a valid SMS job successfully', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        provider: 2,
        recipient: '+8613800138000',
        content: 'Test SMS content',
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
      } as Job<any>;

      // Act
      await processor.handleSmsSend(mockJob);

      // Assert
      expect(smsService.sendSingleSms).toHaveBeenCalledWith(
        jobData.batchId,
        jobData.messageId,
        jobData.provider,
        jobData.recipient,
        jobData.content,
      );

      // Should check if batch is complete
      expect(smsService.isBatchProcessingComplete).toHaveBeenCalledWith(
        jobData.batchId,
      );
    });

    it('should reject invalid job data', async () => {
      // Arrange
      const invalidJobData = {
        // 缺少必要的字段
        batchId: 1,
        messageId: 10,
        // provider is missing
        recipient: '+8613800138000',
        // content is missing
      };

      const mockJob = {
        id: 'job-123',
        data: invalidJobData,
      } as Job<any>;

      // Act & Assert
      await expect(processor.handleSmsSend(mockJob)).rejects.toThrow(
        `任务 ${mockJob.id} 数据格式无效`,
      );

      // Should not call these services
      expect(smsService.sendSingleSms).not.toHaveBeenCalled();
      expect(smsService.isBatchProcessingComplete).not.toHaveBeenCalled();
    });

    it('should handle errors from sendSingleSms and update message status', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        provider: 2,
        recipient: '+8613800138000',
        content: 'Test SMS content',
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
      } as Job<any>;

      const error = new Error('SMS sending failed');
      smsService.sendSingleSms.mockRejectedValue(error);

      // Act & Assert
      await expect(processor.handleSmsSend(mockJob)).rejects.toThrow(error);

      // Should try to update message status to failed
      expect(smsService.updateSmsMessageStatus).toHaveBeenCalledWith(
        jobData.messageId,
        'failed',
        error.message,
      );

      // Should still check batch status
      expect(smsService.isBatchProcessingComplete).toHaveBeenCalledWith(
        jobData.batchId,
      );
    });

    it('should finalize batch status when all messages are processed', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        provider: 2,
        recipient: '+8613800138000',
        content: 'Test SMS content',
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
      } as Job<any>;

      // Mock batch is complete
      smsService.isBatchProcessingComplete.mockResolvedValue(true);

      // Act
      await processor.handleSmsSend(mockJob);

      // Assert
      expect(smsService.sendSingleSms).toHaveBeenCalled();
      expect(smsService.isBatchProcessingComplete).toHaveBeenCalledWith(
        jobData.batchId,
      );
      expect(smsService.finalizeBatchStatus).toHaveBeenCalledWith(
        jobData.batchId,
      );
    });

    it('should not finalize batch status when not all messages are processed', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        provider: 2,
        recipient: '+8613800138000',
        content: 'Test SMS content',
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
      } as Job<any>;

      // Mock batch is not complete
      smsService.isBatchProcessingComplete.mockResolvedValue(false);

      // Act
      await processor.handleSmsSend(mockJob);

      // Assert
      expect(smsService.sendSingleSms).toHaveBeenCalled();
      expect(smsService.isBatchProcessingComplete).toHaveBeenCalledWith(
        jobData.batchId,
      );
      expect(smsService.finalizeBatchStatus).not.toHaveBeenCalled();
    });
  });

  describe('checkAndUpdateBatchStatus', () => {
    it('should finalize batch status when all messages are processed', async () => {
      // Arrange
      const batchId = 1;
      smsService.isBatchProcessingComplete.mockResolvedValue(true);

      // Act
      await processor['checkAndUpdateBatchStatus'](batchId);

      // Assert
      expect(smsService.isBatchProcessingComplete).toHaveBeenCalledWith(
        batchId,
      );
      expect(smsService.finalizeBatchStatus).toHaveBeenCalledWith(batchId);
    });

    it('should not finalize batch status when not all messages are processed', async () => {
      // Arrange
      const batchId = 1;
      smsService.isBatchProcessingComplete.mockResolvedValue(false);

      // Act
      await processor['checkAndUpdateBatchStatus'](batchId);

      // Assert
      expect(smsService.isBatchProcessingComplete).toHaveBeenCalledWith(
        batchId,
      );
      expect(smsService.finalizeBatchStatus).not.toHaveBeenCalled();
    });

    it('should handle errors during batch status check', async () => {
      // Arrange
      const batchId = 1;
      const error = new Error('Database error');
      smsService.isBatchProcessingComplete.mockRejectedValue(error);

      // Act
      await processor['checkAndUpdateBatchStatus'](batchId);

      // Assert
      expect(smsService.isBatchProcessingComplete).toHaveBeenCalledWith(
        batchId,
      );
      expect(smsService.finalizeBatchStatus).not.toHaveBeenCalled();
      // Shouldn't throw error
    });
  });
});
