import { Controller } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';

// REST endpoints will be added in a later milestone.
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}
}
