import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from './schemas/review.schema.js';
import { ReviewListView, ReviewView } from './reviews.types.js';

// "Kasun Perera" → "K. Perera" (customers' full names are not shown publicly).
function shortenName(name: string | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Customer';
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]![0]!.toUpperCase()}. ${parts[parts.length - 1]}`;
}

@Injectable()
export class ReviewsService {
  constructor(@InjectModel(Review.name) private readonly reviewModel: Model<Review>) {}

  async findForProvider(providerUserId: string, limit = 10, skip = 0): Promise<ReviewListView> {
    const filter = { provider: new Types.ObjectId(providerUserId) };
    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ customer: { name: string } | null }>('customer', 'name')
        .lean()
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    const items: ReviewView[] = reviews.map((review) => ({
      id: String(review._id),
      rating: review.rating,
      comment: review.comment,
      customerName: shortenName(review.customer?.name),
      createdAt: review.createdAt,
    }));

    return { items, total };
  }
}
