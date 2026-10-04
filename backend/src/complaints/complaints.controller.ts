import { Controller } from '@nestjs/common';
import { ComplaintsService } from './complaints.service.js';

// REST endpoints will be added in a later milestone.
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}
}
