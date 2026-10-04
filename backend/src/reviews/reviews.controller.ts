import { Controller } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';

// REST endpoints will be added in a later milestone.
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}
}
