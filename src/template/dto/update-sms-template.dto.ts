import { PartialType } from '@nestjs/swagger'; // 或者 @nestjs/mapped-types
import { CreateSmsTemplateDto } from './create-sms-template.dto';

export class UpdateSmsTemplateDto extends PartialType(CreateSmsTemplateDto) {}
