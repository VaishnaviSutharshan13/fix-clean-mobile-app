import { Controller } from '@nestjs/common';
import { ProvidersService } from './providers.service.js';

// REST endpoints will be added in a later milestone.
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}
}
