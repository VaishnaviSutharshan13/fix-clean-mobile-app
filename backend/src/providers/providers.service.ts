import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { BookingStatus } from '../bookings/booking-status.js';
import { BOOKINGS_COLLECTION } from '../bookings/schemas/booking.schema.js';
import { REVIEWS_COLLECTION } from '../reviews/schemas/review.schema.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { sriLankaNow } from '../bookings/booking-dates.js';
import { avatarPath } from '../users/avatar.js';
import { nextOpenSlot, normalizeAvailability } from './availability.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import { UpdateServicesDto } from './dto/update-services.dto.js';
import { ProviderSort } from './dto/list-providers-query.dto.js';
import {
  CategorySummary,
  ProviderAccountView,
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

// Customers only see providers an administrator has verified AND who offer at
// least one service (otherwise there would be nothing to book).
export const CUSTOMER_VISIBLE = {
  verificationStatus: VerificationStatus.Verified,
  'services.0': { $exists: true },
};

// Excludes providers whose account an administrator has suspended. Joined
// from the users collection; accounts without the field count as active.
export const ACTIVE_ACCOUNT_STAGES: PipelineStage[] = [
  {
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      pipeline: [{ $match: { isActive: { $ne: false } } }, { $project: { _id: 1 } }],
      as: 'activeAccount',
    },
  },
  { $match: { 'activeAccount.0': { $exists: true } } },
  { $project: { activeAccount: 0 } },
];

export function escapeRegex(value: string): string {
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
    const match: Record<string, unknown> = { ...CUSTOMER_VISIBLE };
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
        { $match: CUSTOMER_VISIBLE },
        ...ACTIVE_ACCOUNT_STAGES,
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
          $match: { user: new Types.ObjectId(providerUserId), ...CUSTOMER_VISIBLE },
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
      availability: normalizeAvailability(row.availability),
    };
  }

  async getAccount(user: AuthUser): Promise<ProviderAccountView> {
    const profile = await this.profileModel.findOne({ user: new Types.ObjectId(user.id) }).exec();
    if (!profile) throw new NotFoundException('Provider profile not found');
    return toAccountView(user, profile);
  }

  // Services & Rates: the provider proposes their services, prices and visiting
  // fee. They are approved together with the profile during admin verification.
  async updateServices(user: AuthUser, dto: UpdateServicesDto): Promise<ProviderAccountView> {
    const profile = await this.profileModel.findOne({ user: new Types.ObjectId(user.id) }).exec();
    if (!profile) throw new NotFoundException('Provider profile not found');

    const names = dto.services.map((s) => s.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      throw new BadRequestException('Each service must have a different name');
    }

    const existing = new Map(profile.services.map((s) => [String(s._id), s]));
    for (const service of dto.services) {
      if (service.id && !existing.has(service.id)) {
        throw new BadRequestException('Unknown service');
      }
    }

    profile.set(
      'services',
      dto.services.map((s) => ({
        // Keep ids of edited services stable (bookings keep a snapshot anyway).
        _id: s.id ? new Types.ObjectId(s.id) : new Types.ObjectId(),
        name: s.name,
        description: s.description ?? '',
        price: s.price,
      })),
    );
    profile.visitFee = dto.visitFee;
    // Policy: services & prices stay provider-controlled after verification
    // (the provider remains verified); the change is timestamped so
    // administrators can see it on Verification Details.
    profile.servicesUpdatedAt = new Date();
    await profile.save();
    return toAccountView(user, profile);
  }

  // FR5: persists the provider's availability.
  async updateAvailability(user: AuthUser, dto: UpdateAvailabilityDto): Promise<ProviderAccountView> {
    if (dto.isAvailable && (dto.workingDays.length === 0 || dto.timeSlots.length === 0)) {
      throw new BadRequestException(
        'Choose at least one working day and one shift window, or switch duty status off.',
      );
    }
    const availability = normalizeAvailability(dto);
    const profile = await this.profileModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(user.id) },
        { $set: { availability, availabilityUpdatedAt: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!profile) throw new NotFoundException('Provider profile not found');
    return toAccountView(user, profile);
  }

  // Creates the profile linked to a newly registered provider account.
  // New providers start as "pending" until an administrator verifies them (FR7).
  createForNewProvider(input: {
    userId: Types.ObjectId;
    category: ServiceCategory;
    serviceArea: string;
    experienceYears: number;
  }): Promise<ProviderProfileDocument> {
    const label = input.category.charAt(0).toUpperCase() + input.category.slice(1);
    return this.profileModel.create({
      user: input.userId,
      category: input.category,
      headline: `${label} Specialist`,
      serviceArea: input.serviceArea,
      experienceYears: input.experienceYears,
      verificationStatus: VerificationStatus.Pending,
    });
  }

  // Used by the bookings module to validate the provider being booked.
  async findVerifiedProfile(providerUserId: string): Promise<ProviderProfileDocument | null> {
    const [row] = await this.profileModel
      .aggregate<ProviderProfile>([
        { $match: { user: new Types.ObjectId(providerUserId), ...CUSTOMER_VISIBLE } },
        ...ACTIVE_ACCOUNT_STAGES,
      ])
      .exec();
    return row ? this.profileModel.hydrate(row) : null;
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
          // Suspended accounts are never shown to customers.
          pipeline: [{ $match: { isActive: { $ne: false } } }, { $project: { name: 1, avatarUpdatedAt: 1 } }],
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
  user: { _id: Types.ObjectId; name: string; avatarUpdatedAt?: Date };
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
    isAvailable: normalizeAvailability(row.availability).isAvailable,
    avatarUrl: avatarPath(String(row.user._id), row.user.avatarUpdatedAt),
    nextSlot: nextOpenSlot(normalizeAvailability(row.availability), sriLankaNow()),
  };
}

function toAccountView(user: AuthUser, profile: ProviderProfileDocument): ProviderAccountView {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    email: user.email,
    phone: user.phone,
    category: profile.category,
    headline: profile.headline,
    serviceArea: profile.serviceArea,
    experienceYears: profile.experienceYears,
    verificationStatus: profile.verificationStatus,
    verificationChecks: {
      identity: !!profile.verificationChecks?.identity,
      contact: !!profile.verificationChecks?.contact,
      experience: !!profile.verificationChecks?.experience,
    },
    rejectionReason:
      profile.verificationStatus === VerificationStatus.Rejected ? (profile.rejectionReason ?? null) : null,
    servicesCount: profile.services.length,
    services: profile.services.map((s) => ({
      id: String(s._id),
      name: s.name,
      description: s.description,
      price: s.price,
    })),
    visitFee: profile.visitFee,
    availability: normalizeAvailability(profile.availability),
    // null until the provider saves availability for the first time.
    availabilityUpdatedAt: profile.availabilityUpdatedAt ?? null,
  };
}
