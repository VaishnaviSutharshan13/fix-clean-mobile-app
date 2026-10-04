import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { BookingStatus } from '../bookings/booking-status.js';
import { BOOKINGS_COLLECTION } from '../bookings/schemas/booking.schema.js';
import { REVIEWS_COLLECTION } from '../reviews/schemas/review.schema.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { ProviderSort } from './dto/list-providers-query.dto.js';
import {
  CategorySummary,
  ProviderDetails,
  ProviderSummary,
} from './providers.types.js';
import {
  ProviderProfile,
  ProviderProfileDocument,
  ServiceCategory,
  VerificationStatus,
} from './schemas/provider-profile.schema.js';

type ListOptions = {
  category?: ServiceCategory;
  search?: string;
  sort?: ProviderSort;
  limit?: number;
};

const SORT_STAGES: Record<ProviderSort, Record<string, 1 | -1>> = {
  rating: { ratingAverage: -1, reviewCount: -1, _id: 1 },
  price: { startingPrice: 1, ratingAverage: -1, _id: 1 },
  experience: { experienceYears: -1, ratingAverage: -1, _id: 1 },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class ProvidersService {
  constructor(
    @InjectModel(ProviderProfile.name)
    private readonly profileModel: Model<ProviderProfile>,
    private readonly reviewsService: ReviewsService,
  ) {}

  // Verified providers with live rating/review/job statistics computed from the
  // reviews and bookings collections (never stored as fixed numbers).
  async listVerified(options: ListOptions = {}): Promise<ProviderSummary[]> {
    const match: Record<string, unknown> = { verificationStatus: VerificationStatus.Verified };
    if (options.category) match.category = options.category;

    const pipeline: PipelineStage[] = [
      { $match: match },
      ...this.joinUserStages(),
    ];

    if (options.search) {
      const rx = new RegExp(escapeRegex(options.search), 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': rx },
            { headline: rx },
            { serviceArea: rx },
            { category: rx },
            { 'services.name': rx },
          ],
        },
      });
    }

    pipeline.push(
      ...this.statsStages(),
      { $sort: SORT_STAGES[options.sort ?? 'rating'] },
      { $limit: options.limit ?? 20 },
    );

    const rows = await this.profileModel.aggregate<AggregatedProvider>(pipeline).exec();
    return rows.map(toSummary);
  }

  async getCategories(): Promise<CategorySummary[]> {
    const rows = await this.profileModel
      .aggregate<{ _id: ServiceCategory; providerCount: number; startingPrice: number | null }>([
        { $match: { verificationStatus: VerificationStatus.Verified } },
        {
          $group: {
            _id: '$category',
            providerCount: { $sum: 1 },
            startingPrice: { $min: { $min: '$services.price' } },
          },
        },
      ])
      .exec();

    // Always return every category, in the prototype's order.
    return Object.values(ServiceCategory).map((category) => {
      const row = rows.find((r) => r._id === category);
      return {
        category,
        providerCount: row?.providerCount ?? 0,
        startingPrice: row?.startingPrice ?? null,
      };
    });
  }

  async getVerifiedDetails(providerUserId: string): Promise<ProviderDetails> {
    const [row] = await this.profileModel
      .aggregate<AggregatedProvider>([
        {
          $match: {
            user: new Types.ObjectId(providerUserId),
            verificationStatus: VerificationStatus.Verified,
          },
        },
        ...this.joinUserStages(),
        ...this.statsStages(),
      ])
      .exec();

    if (!row) {
      throw new NotFoundException('Provider not found');
    }

    const reviews = await this.reviewsService.findForProvider(providerUserId, 3);
    const prices = row.services.map((s) => s.price);

    return {
      ...toSummary(row),
      bio: row.bio,
      services: row.services.map((s) => ({
        id: String(s._id),
        name: s.name,
        description: s.description,
        price: s.price,
      })),
      priceRange: {
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
      },
      recentReviews: reviews.items,
      memberSince: row.createdAt,
    };
  }

  // Used by the bookings module to validate the provider being booked.
  findVerifiedProfile(providerUserId: string): Promise<ProviderProfileDocument | null> {
    return this.profileModel
      .findOne({
        user: new Types.ObjectId(providerUserId),
        verificationStatus: VerificationStatus.Verified,
      })
      .exec();
  }

  findProfilesByUserIds(userIds: Types.ObjectId[]): Promise<ProviderProfileDocument[]> {
    return this.profileModel.find({ user: { $in: userIds } }).exec();
  }

  private joinUserStages(): PipelineStage[] {
    return [
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          pipeline: [{ $project: { name: 1 } }],
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ];
  }

  private statsStages(): PipelineStage[] {
    return [
      {
        $lookup: {
          from: REVIEWS_COLLECTION,
          localField: 'user._id',
          foreignField: 'provider',
          pipeline: [{ $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }],
          as: 'reviewStats',
        },
      },
      {
        $lookup: {
          from: BOOKINGS_COLLECTION,
          localField: 'user._id',
          foreignField: 'provider',
          pipeline: [{ $match: { status: BookingStatus.Completed } }, { $count: 'count' }],
          as: 'jobStats',
        },
      },
      {
        $addFields: {
          ratingAverage: { $round: [{ $ifNull: [{ $first: '$reviewStats.avg' }, 0] }, 1] },
          reviewCount: { $ifNull: [{ $first: '$reviewStats.count' }, 0] },
          completedJobs: { $ifNull: [{ $first: '$jobStats.count' }, 0] },
          startingPrice: { $ifNull: [{ $min: '$services.price' }, 0] },
        },
      },
    ];
  }
}

type AggregatedProvider = ProviderProfile & {
  _id: Types.ObjectId;
  user: { _id: Types.ObjectId; name: string };
  ratingAverage: number;
  reviewCount: number;
  completedJobs: number;
  startingPrice: number;
};

function toSummary(row: AggregatedProvider): ProviderSummary {
  return {
    id: String(row.user._id),
    name: row.user.name,
    headline: row.headline,
    category: row.category,
    serviceArea: row.serviceArea,
    experienceYears: row.experienceYears,
    startingPrice: row.startingPrice,
    visitFee: row.visitFee,
    ratingAverage: row.ratingAverage,
    reviewCount: row.reviewCount,
    completedJobs: row.completedJobs,
    verificationStatus: row.verificationStatus,
    verificationChecks: {
      identity: !!row.verificationChecks?.identity,
      contact: !!row.verificationChecks?.contact,
      experience: !!row.verificationChecks?.experience,
    },
  };
}
