import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessor } from './email.processor';
import { NotificationService } from './notification.service';
import { Job } from 'bull';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let notificationService: any;

  beforeEach(async () => {
    // 创建mock对象
    notificationService = {
      sendSingleEmail: jest.fn().mockResolvedValue(undefined),
      updateEmailMessageStatus: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        {
          provide: NotificationService,
          useValue: notificationService,
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleEmailSend', () => {
    it('should process a valid email job successfully', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        recipient: 'user@example.com',
        subject: 'Test Subject',
        bodyHtml: '<p>Test Email HTML Content</p>',
        bodyText: 'Test Email Plain Text Content',
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
      } as Job<any>;

      // Act
      await processor.handleEmailSend(mockJob);

      // Assert
      expect(notificationService.sendSingleEmail).toHaveBeenCalledWith(
        jobData.batchId,
        jobData.messageId,
        jobData.recipient,
        jobData.subject,
        jobData.bodyHtml,
        jobData.bodyText,
      );
    });

    it('should reject invalid job data', async () => {
      // Arrange
      const invalidJobData = {
        // 缺少必要的字段
        batchId: 1,
        messageId: 10,
        // recipient is missing
        // subject is missing
        bodyHtml: '<p>Test Email Content</p>',
      };

      const mockJob = {
        id: 'job-123',
        data: invalidJobData,
      } as Job<any>;

      // Act & Assert
      await expect(processor.handleEmailSend(mockJob)).rejects.toThrow(
        `任务 ${mockJob.id} 邮件数据格式无效`,
      );

      // Should not call services
      expect(notificationService.sendSingleEmail).not.toHaveBeenCalled();
    });

    it('should handle null values in bodyHtml or bodyText', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        recipient: 'user@example.com',
        subject: 'Test Subject',
        bodyHtml: null,
        bodyText: 'Text only email',
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
      } as Job<any>;

      // Act
      await processor.handleEmailSend(mockJob);

      // Assert
      expect(notificationService.sendSingleEmail).toHaveBeenCalledWith(
        jobData.batchId,
        jobData.messageId,
        jobData.recipient,
        jobData.subject,
        null,
        jobData.bodyText,
      );
    });

    it('should handle errors from sendSingleEmail and update message status', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        recipient: 'user@example.com',
        subject: 'Test Subject',
        bodyHtml: '<p>Test Email Content</p>',
        bodyText: 'Test Email Plain Text',
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
      } as Job<any>;

      const error = new Error('Email sending failed');
      notificationService.sendSingleEmail.mockRejectedValue(error);

      // Act & Assert
      await expect(processor.handleEmailSend(mockJob)).rejects.toThrow(error);

      // Should try to update message status to failed
      expect(notificationService.updateEmailMessageStatus).toHaveBeenCalledWith(
        jobData.messageId,
        'failed',
        error.message,
      );
    });

    it('should handle non-Error objects thrown during email sending', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        recipient: 'user@example.com',
        subject: 'Test Subject',
        bodyHtml: '<p>Test Email Content</p>',
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
      } as Job<any>;

      // String error message instead of Error object
      notificationService.sendSingleEmail.mockRejectedValue(
        'SMTP connection error',
      );

      // Act & Assert
      await expect(processor.handleEmailSend(mockJob)).rejects.toThrow(
        `Email processing job ${mockJob.id} failed: SMTP connection error`,
      );

      // Should try to update message status to failed
      expect(notificationService.updateEmailMessageStatus).toHaveBeenCalledWith(
        jobData.messageId,
        'failed',
        'SMTP connection error',
      );
    });

    it('should handle errors during status update', async () => {
      // Arrange
      const jobData = {
        batchId: 1,
        messageId: 10,
        recipient: 'user@example.com',
        subject: 'Test Subject',
        bodyHtml: '<p>Test Email Content</p>',
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
      } as Job<any>;

      const sendError = new Error('Email sending failed');
      notificationService.sendSingleEmail.mockRejectedValue(sendError);

      const updateError = new Error('Database error');
      notificationService.updateEmailMessageStatus.mockRejectedValue(
        updateError,
      );

      // Act & Assert
      await expect(processor.handleEmailSend(mockJob)).rejects.toThrow(
        sendError,
      );

      // Should attempt to update status even though it will fail
      expect(notificationService.updateEmailMessageStatus).toHaveBeenCalledWith(
        jobData.messageId,
        'failed',
        sendError.message,
      );
    });
  });
});
