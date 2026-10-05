import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ACTIVE_BOOKING_STATUSES, BookingStatus } from '../bookings/booking-status.js';
import { Booking } from '../bookings/schemas/booking.schema.js';
import { ComplaintStatus } from '../complaints/complaint-status.js';
import { ACTIVE_ACCOUNT_STAGES, CUSTOMER_VISIBLE } from '../providers/providers.service.js';
import { ProviderProfile, VerificationStatus } from '../providers/schemas/provider-profile.schema.js';
import { Role, User } from '../users/schemas/user.schema.js';
import { countsBy } from './admin-people.js';
import { AdminBookingsService } from './admin-bookings.service.js';
import { AdminComplaintsService } from './admin-complaints.service.js';
import { AdminVerificationService } from './admin-verification.service.js';
import type { AdminDashboardView } from './admin.types.js';

// Admin Dashboard (FR8): every number is counted from MongoDB on request.
@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(ProviderProfile.name) private readonly profileModel: Model<ProviderProfile>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    private readonly verification: AdminVerificationService,
    private readonly bookings: AdminBookingsService,
    private readonly complaints: AdminComplaintsService,
  ) {}

  async get(): Promise<AdminDashboardView> {
    const [roleRows, suspended, providerCounts, bookable, bookingRows, complaintCounts, queue, recent] =
      await Promise.all([
        this.userModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$role', count: { $sum: 1 } } }]).exec(),
        this.userModel.countDocuments({ isActive: false }).exec(),
        this.verification.statusCounts(),
        // Exactly the providers customers can currently find and book.
        this.profileModel
          .aggregate<{ count: number }>([{ $match: CUSTOMER_VISIBLE }, ...ACTIVE_ACCOUNT_STAGES, { $count: 'count' }])
          .exec(),
        this.bookingModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
        this.complaints.statusCounts(),
        this.verification.list({ status: VerificationStatus.Pending }, 3),
        this.bookings.list({}, 5),
      ]);

    const roles = countsBy(Object.values(Role), roleRows);
    const byStatus = countsBy(Object.values(BookingStatus), bookingRows);
    const { all: totalBookings, ...statusOnly } = byStatus;

    return {
      users: {
        total: roles.all,
        customers: roles[Role.Customer],
        providers: roles[Role.Provider],
        admins: roles[Role.Admin],
        suspended,
      },
      providers: {
        pending: providerCounts[VerificationStatus.Pending],
        verified: providerCounts[VerificationStatus.Verified],
        rejected: providerCounts[VerificationStatus.Rejected],
        bookable: bookable[0]?.count ?? 0,
      },
      bookings: {
        total: totalBookings,
        active: ACTIVE_BOOKING_STATUSES.reduce((sum, s) => sum + byStatus[s], 0),
        completed: byStatus[BookingStatus.Completed],
        cancelledOrDeclined: byStatus[BookingStatus.Cancelled] + byStatus[BookingStatus.Declined],
        byStatus: statusOnly,
      },
      complaints: {
        open: complaintCounts[ComplaintStatus.Open],
        inReview: complaintCounts[ComplaintStatus.InReview],
        resolved: complaintCounts[ComplaintStatus.Resolved],
        unresolved: complaintCounts[ComplaintStatus.Open] + complaintCounts[ComplaintStatus.InReview],
      },
      pendingVerifications: queue.items,
      recentBookings: recent.items,
      generatedAt: new Date(),
    };
  }
}
