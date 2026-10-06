import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { ACTIVE_BOOKING_STATUSES, BookingStatus } from '../bookings/booking-status.js';
import { Booking } from '../bookings/schemas/booking.schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { normalizeAvailability } from '../providers/availability.js';
import { escapeRegex } from '../providers/providers.service.js';
import { ProviderProfile, VerificationStatus } from '../providers/schemas/provider-profile.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { countsBy } from './admin-people.js';
import type { AdminListResponse, AdminProviderDetails, AdminProviderListItem } from './admin.types.js';
import type { AdminProvidersQueryDto } from './dto/admin-queries.dto.js';
import type { RejectProviderDto, UpdateVerificationChecksDto } from './dto/admin-actions.dto.js';
import { approvalProblems } from './provider-readiness.js';

type ProfileRow = ProviderProfile & {
  _id: Types.ObjectId;
  account: { _id: Types.ObjectId; name: string; isActive?: boolean };
};

const LIST_LIMIT = 100;

// Provider verification (FR7): review queue, details, the admin checklist and
// the pending → verified / pending → rejected transitions. Providers are
// addressed by their User id, the same id customers see and book with.
@Injectable()
export class AdminVerificationService {
  constructor(
    @InjectModel(ProviderProfile.name) private readonly profileModel: Model<ProviderProfile>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    query: AdminProvidersQueryDto,
    limit = LIST_LIMIT,
  ): Promise<AdminListResponse<AdminProviderListItem, VerificationStatus>> {
    const status = query.status ?? VerificationStatus.Pending;
    const pipeline: PipelineStage[] = [
      { $match: status === 'all' ? {} : { verificationStatus: status } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          pipeline: [{ $project: { name: 1, email: 1, isActive: 1 } }],
          as: 'account',
        },
      },
      { $unwind: '$account' },
    ];
    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'account.name': rx },
            { 'account.email': rx },
            { serviceArea: rx },
            { headline: rx },
            { category: rx },
          ],
        },
      });
    }
    // The pending queue is reviewed oldest first; reviewed lists newest first.
    pipeline.push(
      { $sort: status === VerificationStatus.Pending ? { createdAt: 1 } : { reviewedAt: -1, createdAt: -1 } },
      { $limit: limit },
    );

    const [rows, counts] = await Promise.all([
      this.profileModel.aggregate<ProfileRow>(pipeline).exec(),
      this.statusCounts(),
    ]);
    return { items: rows.map(toListItem), counts };
  }

  async statusCounts(): Promise<Record<VerificationStatus | 'all', number>> {
    const rows = await this.profileModel
      .aggregate<{ _id: string; count: number }>([{ $group: { _id: '$verificationStatus', count: { $sum: 1 } } }])
      .exec();
    return countsBy(Object.values(VerificationStatus), rows);
  }

  async details(providerUserId: string): Promise<AdminProviderDetails> {
    const userId = new Types.ObjectId(providerUserId);
    const [profile, account] = await Promise.all([
      this.profileModel.findOne({ user: userId }).lean().exec(),
      this.userModel.findById(userId, 'name email phone isActive createdAt').lean().exec(),
    ]);
    if (!profile || !account) throw new NotFoundException('Provider not found');

    const [total, active, completed, reviewer] = await Promise.all([
      this.bookingModel.countDocuments({ provider: userId }).exec(),
      this.bookingModel.countDocuments({ provider: userId, status: { $in: ACTIVE_BOOKING_STATUSES } }).exec(),
      this.bookingModel.countDocuments({ provider: userId, status: BookingStatus.Completed }).exec(),
      profile.reviewedBy ? this.userModel.findById(profile.reviewedBy, 'name').lean().exec() : null,
    ]);

    const pending = profile.verificationStatus === VerificationStatus.Pending;
    const problems = pending ? approvalProblems(profile, account) : [];
    const servicesChangedSinceApproval =
      profile.verificationStatus === VerificationStatus.Verified &&
      !!profile.servicesUpdatedAt &&
      !!profile.verifiedAt &&
      profile.servicesUpdatedAt > profile.verifiedAt;

    return {
      ...toListItem({ ...profile, account } as ProfileRow),
      email: account.email,
      phone: account.phone,
      bio: profile.bio ?? '',
      visitFee: profile.visitFee,
      services: profile.services.map((s) => ({
        id: String(s._id),
        name: s.name,
        description: s.description ?? '',
        price: s.price,
      })),
      availability: normalizeAvailability(profile.availability),
      availabilityUpdatedAt: profile.availabilityUpdatedAt ?? null,
      rejectionReason: profile.rejectionReason ?? null,
      verifiedAt: profile.verifiedAt ?? null,
      reviewedBy: reviewer?.name ?? null,
      servicesUpdatedAt: profile.servicesUpdatedAt ?? null,
      servicesChangedSinceApproval,
      bookingStats: { total, active, completed },
      approval: { ready: pending && problems.length === 0, problems },
    };
  }

  // Saves the admin's identity / contact / experience confirmations while the
  // application is pending. Approval requires all three.
  async updateChecks(providerUserId: string, dto: UpdateVerificationChecksDto): Promise<AdminProviderDetails> {
    const set: Record<string, boolean> = {};
    for (const key of ['identity', 'contact', 'experience'] as const) {
      if (dto[key] !== undefined) set[`verificationChecks.${key}`] = dto[key];
    }
    if (Object.keys(set).length === 0) {
      throw new BadRequestException('Choose at least one verification check to update.');
    }

    const updated = await this.profileModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(providerUserId), verificationStatus: VerificationStatus.Pending },
        { $set: set },
      )
      .exec();
    if (!updated) {
      await this.assertPending(providerUserId, 'Verification checks can only be changed while the application is pending.');
    }
    return this.details(providerUserId);
  }

  // pending → verified. Only allowed when the provider is ready to be booked
  // (see approvalProblems); otherwise the problems are returned as a 400.
  async approve(adminId: string, providerUserId: string): Promise<AdminProviderDetails> {
    const userId = new Types.ObjectId(providerUserId);
    const [profile, account] = await Promise.all([
      this.profileModel.findOne({ user: userId }).lean().exec(),
      this.userModel.findById(userId, 'name email phone isActive').lean().exec(),
    ]);
    if (!profile) throw new NotFoundException('Provider not found');
    if (profile.verificationStatus !== VerificationStatus.Pending) {
      throw new ConflictException(`This provider has already been ${profile.verificationStatus}.`);
    }

    const problems = approvalProblems(profile, account);
    if (problems.length > 0) throw new BadRequestException(problems);

    const now = new Date();
    // Atomic: two admins approving/rejecting at once can't both succeed.
    const updated = await this.profileModel
      .findOneAndUpdate(
        { user: userId, verificationStatus: VerificationStatus.Pending },
        {
          $set: {
            verificationStatus: VerificationStatus.Verified,
            verifiedAt: now,
            reviewedAt: now,
            reviewedBy: new Types.ObjectId(adminId),
          },
          $unset: { rejectionReason: 1 },
        },
      )
      .exec();
    if (!updated) {
      await this.assertPending(providerUserId, 'This application was just reviewed. Please refresh.');
    }
    await this.notifications.notifyProviderVerification(providerUserId, true);
    return this.details(providerUserId);
  }

  // pending → rejected, with an optional reason shown to the provider.
  async reject(adminId: string, providerUserId: string, dto: RejectProviderDto): Promise<AdminProviderDetails> {
    const now = new Date();
    const updated = await this.profileModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(providerUserId), verificationStatus: VerificationStatus.Pending },
        {
          $set: {
            verificationStatus: VerificationStatus.Rejected,
            reviewedAt: now,
            reviewedBy: new Types.ObjectId(adminId),
            ...(dto.reason ? { rejectionReason: dto.reason } : {}),
          },
          $unset: { verifiedAt: 1, ...(dto.reason ? {} : { rejectionReason: 1 }) },
        },
      )
      .exec();
    if (!updated) {
      await this.assertPending(providerUserId, 'Only pending applications can be rejected.');
    }
    await this.notifications.notifyProviderVerification(providerUserId, false, dto.reason);
    return this.details(providerUserId);
  }

  // Called after a guarded update matched nothing: 404 if the provider doesn't
  // exist, otherwise 409 because it is no longer pending.
  private async assertPending(providerUserId: string, message: string): Promise<never> {
    const current = await this.profileModel
      .findOne({ user: new Types.ObjectId(providerUserId) }, 'verificationStatus')
      .lean()
      .exec();
    if (!current) throw new NotFoundException('Provider not found');
    throw new ConflictException(
      current.verificationStatus === VerificationStatus.Pending
        ? message
        : `${message} This provider is already ${current.verificationStatus}.`,
    );
  }
}

function toListItem(row: ProfileRow): AdminProviderListItem {
  const prices = row.services.map((s) => s.price);
  return {
    id: String(row.user),
    name: row.account.name,
    category: row.category,
    headline: row.headline,
    serviceArea: row.serviceArea,
    experienceYears: row.experienceYears,
    verificationStatus: row.verificationStatus,
    servicesCount: row.services.length,
    startingPrice: prices.length ? Math.min(...prices) : null,
    verificationChecks: {
      identity: !!row.verificationChecks?.identity,
      contact: !!row.verificationChecks?.contact,
      experience: !!row.verificationChecks?.experience,
    },
    accountActive: row.account.isActive !== false,
    submittedAt: row.createdAt,
    reviewedAt: row.reviewedAt ?? null,
  };
}
