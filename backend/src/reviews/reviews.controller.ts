import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../users/schemas/user.schema.js';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';
import { ReviewsService } from './reviews.service.js';
import type { ReviewListView } from './reviews.types.js';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // FR1: customers read a provider's reviews before booking.
  @Get()
  @Roles(Role.Customer)
  list(@Query() query: ListReviewsQueryDto): Promise<ReviewListView> {
    return this.reviewsService.findForProvider(query.providerId, query.limit ?? 10, query.skip ?? 0);
  }
}
