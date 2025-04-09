import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TemplateService } from './template.service';
import { SmsTemplate } from './entities/sms-template.entity';
import { EmailTemplate } from '../email-template/entities/email-template.entity';
import { CreateSmsTemplateDto } from './dto/create-sms-template.dto';
import { UpdateSmsTemplateDto } from './dto/update-sms-template.dto';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { User, UserRole } from '../user/entities/user.entity';

// Define a more specific MockRepository type
type MockRepository = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  delete: jest.Mock;
  // Add other methods if needed by the service
};

const createMockRepository = (): MockRepository => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  // Add other methods if needed by the service
});

describe('TemplateService', () => {
  let service: TemplateService;
  let smsTemplateRepository: MockRepository;
  let emailTemplateRepository: MockRepository;

  const mockUserId = 1;
  const mockSmsTemplateId = 10;
  const mockEmailTemplateId = 20;
  const mockUser: User = {
    id: mockUserId,
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.USER,
    isActive: true,
    passwordHash: 'hashed',
    createTime: new Date(),
    updateTime: new Date(),
    validatePassword: jest.fn(),
    hashPassword: jest.fn(),
    accounts: [],
  };

  const mockSmsTemplate: SmsTemplate = {
    id: mockSmsTemplateId,
    userId: mockUserId,
    name: 'Test SMS',
    content: 'Hello {{name}}',
    variables: ['name'],
    providerTemplateId: null,
    user: mockUser,
    createTime: new Date(),
    updateTime: new Date(),
  };

  const mockEmailTemplate: EmailTemplate = {
    id: mockEmailTemplateId,
    userId: mockUserId,
    name: 'Test Email',
    subject: 'Subject {{topic}}',
    bodyHtml: '<p>Body {{content}}</p>',
    bodyText: null,
    variables: ['topic', 'content'],
    user: mockUser,
    createTime: new Date(),
    updateTime: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: getRepositoryToken(SmsTemplate),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(EmailTemplate),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    smsTemplateRepository = module.get(getRepositoryToken(SmsTemplate));
    emailTemplateRepository = module.get(getRepositoryToken(EmailTemplate));

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- SMS Template Tests ---
  describe('createSmsTemplate', () => {
    it('should create and return an sms template', async () => {
      const createDto: CreateSmsTemplateDto = {
        name: 'New SMS',
        content: 'Code: {{code}}',
      };
      const createdTemplate = {
        ...mockSmsTemplate,
        ...createDto,
        id: 11,
        userId: mockUserId,
        user: mockUser,
      };

      smsTemplateRepository.create.mockReturnValue(createdTemplate);
      smsTemplateRepository.save.mockResolvedValue(createdTemplate);

      const result = await service.createSmsTemplate(mockUserId, createDto);

      expect(smsTemplateRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId: mockUserId,
      });
      expect(smsTemplateRepository.save).toHaveBeenCalledWith(createdTemplate);
      expect(result).toEqual(createdTemplate);
    });
  });

  describe('findOneSmsTemplate', () => {
    it('should return an sms template if found for the user', async () => {
      smsTemplateRepository.findOne.mockResolvedValue(mockSmsTemplate);

      const result = await service.findOneSmsTemplate(
        mockUserId,
        mockSmsTemplateId,
      );

      expect(smsTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSmsTemplateId, userId: mockUserId },
      });
      expect(result).toEqual(mockSmsTemplate);
    });

    it('should throw NotFoundException if template not found', async () => {
      smsTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneSmsTemplate(mockUserId, 999)).rejects.toThrow(
        NotFoundException,
      );
      expect(smsTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999, userId: mockUserId },
      });
    });
  });

  describe('updateSmsTemplate', () => {
    it('should update and return the sms template', async () => {
      const updateDto: UpdateSmsTemplateDto = { name: 'Updated SMS Name' };
      const existingTemplate = { ...mockSmsTemplate };
      const updatedTemplate = { ...existingTemplate, ...updateDto };

      smsTemplateRepository.findOne.mockResolvedValue(existingTemplate);
      smsTemplateRepository.save.mockResolvedValue(updatedTemplate);

      const result = await service.updateSmsTemplate(
        mockUserId,
        mockSmsTemplateId,
        updateDto,
      );

      expect(smsTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSmsTemplateId, userId: mockUserId },
      });
      expect(smsTemplateRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
      expect(result).toEqual(updatedTemplate);
    });

    it('should throw NotFoundException if template to update is not found', async () => {
      const updateDto: UpdateSmsTemplateDto = {
        name: 'Updated',
        content: 'New content',
      };
      smsTemplateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSmsTemplate(mockUserId, 999, updateDto),
      ).rejects.toThrow(NotFoundException);
      expect(smsTemplateRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('removeSmsTemplate', () => {
    it('should remove the template if found for the user', async () => {
      smsTemplateRepository.delete.mockResolvedValue({ affected: 1 });

      await service.removeSmsTemplate(mockUserId, mockSmsTemplateId);

      expect(smsTemplateRepository.delete).toHaveBeenCalledWith({
        id: mockSmsTemplateId,
        userId: mockUserId,
      });
    });

    it('should throw NotFoundException if template not found for the user', async () => {
      smsTemplateRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.removeSmsTemplate(mockUserId, 999)).rejects.toThrow(
        NotFoundException,
      );
      expect(smsTemplateRepository.delete).toHaveBeenCalledWith({
        id: 999,
        userId: mockUserId,
      });
    });
  });

  // --- Email Template Tests (Similar structure) ---
  describe('createEmailTemplate', () => {
    it('should create and return an email template with bodyHtml', async () => {
      const createDto: CreateEmailTemplateDto = {
        name: 'New Email',
        subject: 'Hi',
        bodyHtml: '<p>Test</p>',
      };
      const expectedTemplate = {
        ...mockEmailTemplate,
        ...createDto,
        id: 21,
        userId: mockUserId,
        user: mockUser,
      };

      emailTemplateRepository.create.mockReturnValue(expectedTemplate);
      emailTemplateRepository.save.mockResolvedValue(expectedTemplate);

      const result = await service.createEmailTemplate(mockUserId, createDto);

      expect(emailTemplateRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId: mockUserId,
      });
      expect(emailTemplateRepository.save).toHaveBeenCalledWith(
        expectedTemplate,
      );
      expect(result).toEqual(expectedTemplate);
    });

    it('should create and return an email template with bodyText', async () => {
      const createDto: CreateEmailTemplateDto = {
        name: 'New Email',
        subject: 'Hi',
        bodyText: 'Test',
      };
      const expectedTemplate = {
        ...mockEmailTemplate,
        ...createDto,
        bodyHtml: null,
        id: 22,
        userId: mockUserId,
        user: mockUser,
      };

      emailTemplateRepository.create.mockReturnValue(expectedTemplate);
      emailTemplateRepository.save.mockResolvedValue(expectedTemplate);

      const result = await service.createEmailTemplate(mockUserId, createDto);
      expect(result.bodyHtml).toBeNull();
      expect(result.bodyText).toEqual('Test');
    });

    it('should throw ForbiddenException if neither bodyHtml nor bodyText is provided', async () => {
      const createDto: CreateEmailTemplateDto = {
        name: 'New Email',
        subject: 'Hi',
      };
      await expect(
        service.createEmailTemplate(mockUserId, createDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // Add more tests for findAllEmailTemplates, findOneEmailTemplate, updateEmailTemplate, removeEmailTemplate...

  // --- substituteVariables Tests ---
  describe('substituteVariables', () => {
    it('should substitute variables correctly', () => {
      const template = 'Hello {{ name }}, your code is {{ code }}.';
      const variables = { name: 'Alice', code: 1234 };
      const expected = 'Hello Alice, your code is 1234.';
      expect(service.substituteVariables(template, variables)).toBe(expected);
    });

    it('should handle whitespace in placeholders', () => {
      const template = 'Value: {{  value  }}';
      const variables = { value: 'test' };
      const expected = 'Value: test';
      expect(service.substituteVariables(template, variables)).toBe(expected);
    });

    it('should return original template if no variables provided', () => {
      const template = 'Hello {{ name }}.';
      expect(service.substituteVariables(template)).toBe(template);
      expect(service.substituteVariables(template, {})).toBe(template);
    });

    it('should replace missing variables with empty string', () => {
      const template = 'Name: {{ name }}, Age: {{ age }}';
      const variables = { name: 'Bob' };
      const expected = 'Name: Bob, Age: ';
      expect(service.substituteVariables(template, variables)).toBe(expected);
    });

    it('should handle null/undefined variable values', () => {
      const template = 'A: {{a}}, B: {{b}}';
      const variables = { a: null, b: undefined };
      const expected = 'A: , B: ';
      expect(service.substituteVariables(template, variables)).toBe(expected);
    });

    it('should not substitute anything if template has no placeholders', () => {
      const template = 'Just plain text.';
      const variables = { name: 'Test' };
      expect(service.substituteVariables(template, variables)).toBe(template);
    });
  });
});
