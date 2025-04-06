import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { SmsService } from './sms.service';
import { SmsNotificationBatch } from '../sms-notification-batch/entities/sms-notification-batch.entity';
import { SmsMessage } from '../sms-message/entities/sms-message.entity';
import { SmsProvider } from '../sms-provider/entities/sms-provider.entity';
import { SmsDispatcherService } from '../sms-dispatcher/sms-dispatcher.service';
import { createMockRepository } from '../common/test/test-utils';

describe('SmsService', () => {
  let service: SmsService;
  let smsBatchRepository: any;
  let smsMessageRepository: any;
  let smsProviderRepository: any;
  let smsQueue: any;
  let smsDispatcherService: any;

  beforeEach(async () => {
    // 创建mock对象
    smsBatchRepository = createMockRepository();
    smsMessageRepository = createMockRepository();
    smsProviderRepository = createMockRepository();
    smsQueue = {
      add: jest.fn().mockResolvedValue({}),
    };
    smsDispatcherService = {
      dispatchSms: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: getRepositoryToken(SmsNotificationBatch),
          useValue: smsBatchRepository,
        },
        {
          provide: getRepositoryToken(SmsMessage),
          useValue: smsMessageRepository,
        },
        {
          provide: getRepositoryToken(SmsProvider),
          useValue: smsProviderRepository,
        },
        {
          provide: getQueueToken('sms'),
          useValue: smsQueue,
        },
        {
          provide: SmsDispatcherService,
          useValue: smsDispatcherService,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToSmsQueue', () => {
    it('should add message to queue without delay when no scheduledAt is provided', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        provider: 2,
        recipient: '+8613800138000',
        content: 'Test SMS content',
      };

      // Act
      await service.addToSmsQueue(
        jobData.batchId,
        jobData.messageId,
        jobData.provider,
        jobData.recipient,
        jobData.content,
      );

      // Assert
      expect(smsQueue.add).toHaveBeenCalledWith(jobData, {});
    });

    it('should add message to queue with delay when scheduledAt is provided', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        provider: 2,
        recipient: '+8613800138000',
        content: 'Test SMS content',
      };
      const now = new Date();
      const futureDate = new Date(now.getTime() + 3600000); // 1 hour in the future
      jest.spyOn(Date, 'now').mockImplementation(() => now.getTime());

      // Act
      await service.addToSmsQueue(
        jobData.batchId,
        jobData.messageId,
        jobData.provider,
        jobData.recipient,
        jobData.content,
        futureDate,
      );

      // Assert
      expect(smsQueue.add).toHaveBeenCalledWith(jobData, {
        delay: 3600000, // 1 hour delay
      });

      // Restore Date.now
      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('sendSingleSms', () => {
    it('should update message status to sent when dispatch succeeds', async () => {
      // Arrange
      const messageId = 10;
      const batchId = 1;
      const providerId = 2;
      const recipient = '+8613800138000';
      const content = 'Test message';
      const providerMessageId = 'provider-msg-id-123';

      smsDispatcherService.dispatchSms.mockResolvedValue({
        success: true,
        providerMessageId,
      });

      // Act
      await service.sendSingleSms(
        batchId,
        messageId,
        providerId,
        recipient,
        content,
      );

      // Assert
      expect(smsDispatcherService.dispatchSms).toHaveBeenCalledWith(
        messageId,
        providerId,
        recipient,
        content,
      );

      // Should have updated message status twice: first to 'sending', then to 'sent'
      expect(smsMessageRepository.update).toHaveBeenCalledTimes(2);

      // Check the second update call with 'sent' status
      expect(smsMessageRepository.update).toHaveBeenLastCalledWith(
        messageId,
        expect.objectContaining({
          status: 'sent',
          providerMessageId,
          errorMessage: null,
        }),
      );
    });

    it('should update message status to failed when dispatch fails', async () => {
      // Arrange
      const messageId = 10;
      const batchId = 1;
      const providerId = 2;
      const recipient = '+8613800138000';
      const content = 'Test message';
      const errorMessage = 'Dispatch failed';

      smsDispatcherService.dispatchSms.mockResolvedValue({
        success: false,
        errorMessage,
      });

      // Act
      await service.sendSingleSms(
        batchId,
        messageId,
        providerId,
        recipient,
        content,
      );

      // Assert
      expect(smsDispatcherService.dispatchSms).toHaveBeenCalledWith(
        messageId,
        providerId,
        recipient,
        content,
      );

      // Should update twice: first to 'sending', then to 'failed'
      expect(smsMessageRepository.update).toHaveBeenCalledTimes(2);

      // Check the second update call with 'failed' status
      expect(smsMessageRepository.update).toHaveBeenLastCalledWith(
        messageId,
        expect.objectContaining({
          status: 'failed',
          errorMessage,
        }),
      );
    });

    it('should handle exceptions during dispatch', async () => {
      // Arrange
      const messageId = 10;
      const batchId = 1;
      const providerId = 2;
      const recipient = '+8613800138000';
      const content = 'Test message';
      const error = new Error('Network error');

      smsDispatcherService.dispatchSms.mockRejectedValue(error);

      // Act
      await service.sendSingleSms(
        batchId,
        messageId,
        providerId,
        recipient,
        content,
      );

      // Assert
      expect(smsDispatcherService.dispatchSms).toHaveBeenCalledWith(
        messageId,
        providerId,
        recipient,
        content,
      );

      // Should update twice: first to 'sending', then to 'failed'
      expect(smsMessageRepository.update).toHaveBeenCalledTimes(2);

      // Check the second update call with 'failed' status
      expect(smsMessageRepository.update).toHaveBeenLastCalledWith(
        messageId,
        expect.objectContaining({
          status: 'failed',
          errorMessage: error.message,
        }),
      );
    });
  });

  describe('isBatchProcessingComplete', () => {
    it('should return true when all messages are processed', async () => {
      // Arrange
      const batchId = 1;
      const batch = { id: batchId, recipientCount: 3 };

      smsBatchRepository.findOne.mockResolvedValue(batch);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3), // All 3 messages are processed
      };

      smsMessageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.isBatchProcessingComplete(batchId);

      // Assert
      expect(result).toBe(true);
      expect(smsBatchRepository.findOne).toHaveBeenCalledWith({
        where: { id: batchId },
      });
      expect(smsMessageRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'sms_message.batchId = :batchId',
        { batchId },
      );
    });

    it('should return false when not all messages are processed', async () => {
      // Arrange
      const batchId = 1;
      const batch = { id: batchId, recipientCount: 5 };

      smsBatchRepository.findOne.mockResolvedValue(batch);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3), // Only 3 of 5 messages are processed
      };

      smsMessageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.isBatchProcessingComplete(batchId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when batch is not found', async () => {
      // Arrange
      const batchId = 999; // Non-existent batch

      smsBatchRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.isBatchProcessingComplete(batchId);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      // Arrange
      const batchId = 1;
      const error = new Error('Database error');

      smsBatchRepository.findOne.mockRejectedValue(error);

      // Act
      const result = await service.isBatchProcessingComplete(batchId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getSmsProvider', () => {
    it('should return the provider when found', async () => {
      // Arrange
      const providerId = 5;
      const provider = { id: providerId, name: 'onbuka', isActive: true };

      smsProviderRepository.findOne.mockResolvedValue(provider);

      // Act
      const result = await service.getSmsProvider(providerId);

      // Assert
      expect(result).toEqual(provider);
      expect(smsProviderRepository.findOne).toHaveBeenCalledWith({
        where: { id: providerId, isActive: true },
      });
    });

    it('should throw error when provider not found', async () => {
      // Arrange
      const providerId = 999; // Non-existent provider

      smsProviderRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getSmsProvider(providerId)).rejects.toThrow(
        `SMS provider with ID ${providerId} not found or inactive`,
      );
    });
  });
});
