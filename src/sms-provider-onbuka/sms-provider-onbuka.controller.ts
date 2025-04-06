import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';

@Controller('webhooks/onbuka')
export class SmsProviderOnbukaController {
  private readonly logger = new Logger(SmsProviderOnbukaController.name);

  @Post('callback/mo')
  @HttpCode(200)
  handleMoCallback(@Body() payload: any): string {
    this.logger.log(
      `Received MO callback from Onbuka: ${JSON.stringify(payload)}`,
    );
    return 'OK';
  }

  @Post('callback/report')
  @HttpCode(200)
  handleStatusReportCallback(@Body() payload: any): string {
    this.logger.log(
      `Received Report callback from Onbuka: ${JSON.stringify(payload)}`,
    );
    return 'OK';
  }
}
