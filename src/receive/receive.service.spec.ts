import { Test, TestingModule } from '@nestjs/testing';
import { ReceiveService } from './receive.service';

describe('ReceiveService', () => {
  let service: ReceiveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceiveService],
    }).compile();

    service = module.get<ReceiveService>(ReceiveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
