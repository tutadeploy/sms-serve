import { Test, TestingModule } from '@nestjs/testing';
import { NotifyMessageController } from './notify-message.controller';

describe('NotifyMessageController', () => {
  let controller: NotifyMessageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotifyMessageController],
    }).compile();

    controller = module.get<NotifyMessageController>(NotifyMessageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
