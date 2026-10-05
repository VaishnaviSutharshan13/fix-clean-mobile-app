import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ACTIVE_BOOKING_STATUSES, BookingStatus } from '../bookings/booking-status.js';
import { Booking } from '../bookings/schemas/booking.schema.js';
import { Complaint } from '../complaints/schemas/complaint.schema.js';
import { escapeRegex } from '../providers/providers.service.js';
import { ProviderProfile } from '../providers/schemas/provider-profile.schema.js';
import { Role, User } from '../users/schemas/user.schema.js';
import { countsBy } from './admin-people.js';
import type { AdminListResponse, AdminUserDetails, AdminUserListItem } from './admin.types.js';
import type { AdminUsersQueryDto } from './dto/admin-queries.dto.js';

// Explicit projection: the password hash is never read for these screens.
const PUBLIC_FIELDS = 'name email phone role isActive suspendedAt createdAt';
const LIST_LIMIT = 100;

type UserRow = Pick<User, 'name' | 'email' | 'phone' | 'role' | 'isActive' | 'suspendedAt' | 'createdAt'> & {
  _id: Types.ObjectId;
};

// User Management (FR8): list/search accounts and suspend or reactivate
// customer and provider accounts. Accounts are never deleted here.
@Injectable()
export class AdminUsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(ProviderProfile.name) private readonly profileModel: Model<ProviderProfile>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(Complaint.name) private readonly complaintModel: Model<Complaint>,
  ) {}

  async list(query: AdminUsersQueryDto): Promise<AdminListResponse<AdminUserListItem, Role | 'suspended'>> {
    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (query.status === 'active') filter.isActive = { $ne: false };
    if (query.status === 'suspended') filter.isActive = false;
    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const [users, roleRows, suspended] = await Promise.all([
      this.userModel.find(filter, PUBLIC_FIELDS).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean<UserRow[]>().exec(),
      this.userModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$role', count: { $sum: 1 } } }]).exec(),
      this.userModel.countDocuments({ isActive: false }).exec(),
    ]);

    const profiles = await this.profileModel
      .find({ user: { $in: users.filter((u) => u.role === Role.Provider).map((u) => u._id) } })
      .lean()
      .exec();
    const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));

    return {
      items: users.map((u) => toListItem(u, profileByUser.get(String(u._id)))),
      counts: { ...countsBy(Object.values(Role), roleRows), suspended },
    };
  }

  async details(adminId: string, userId: string): Promise<AdminUserDetails> {
    const user = await this.userModel.findById(userId, PUBLIC_FIELDS).lean<UserRow>().exec();
    if (!user) throw new NotFoundException('User not found');

    const id = user._id;
    const asProvider = user.role === Role.Provider;
    const bookingOwner = asProvider ? { provider: id } : { customer: id };
    const [profile, total, active, completed, cancelledOrDeclined, complaintCount] = await Promise.all([
      asProvider ? this.profileModel.findOne({ user: id }).lean().exec() : null,
      this.bookingModel.countDocuments(bookingOwner).exec(),
      this.bookingModel.countDocuments({ ...bookingOwner, status: { $in: ACTIVE_BOOKING_STATUSES } }).exec(),
      this.bookingModel.countDocuments({ ...bookingOwner, status: BookingStatus.Completed }).exec(),
      this.bookingModel
        .countDocuments({ ...bookingOwner, status: { $in: [BookingStatus.Cancelled, BookingStatus.Declined] } })
        .exec(),
      this.complaintModel.countDocuments(asProvider ? { provider: id } : { customer: id }).exec(),
    ]);

    return {
      ...toListItem(user, profile ?? undefined),
      suspendedAt: user.isActive === false ? (user.suspendedAt ?? null) : null,
      bookingStats: { total, active, completed, cancelledOrDeclined },
      complaintCount,
      canChangeStatus: user.role !== Role.Admin && String(id) !== adminId,
    };
  }

  // Suspend (isActive = false) or reactivate a customer/provider account.
  // Suspended users can't sign in, their tokens stop working and suspended
  // providers disappear from customer discovery.
  async setStatus(adminId: string, userId: string, isActive: boolean): Promise<AdminUserDetails> {
    if (userId === adminId) {
      throw new BadRequestException('You cannot suspend or reactivate your own account.');
    }
    const user = await this.userModel.findById(userId, 'role').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.Admin) {
      throw new BadRequestException('Administrator accounts cannot be suspended from the app.');
    }

    await this.userModel
      .updateOne(
        { _id: user._id },
        isActive
          ? { $set: { isActive: true }, $unset: { suspendedAt: 1 } }
          : { $set: { isActive: false, suspendedAt: new Date() } },
      )
      .exec();
    return this.details(adminId, userId);
  }
}

function toListItem(
  u: UserRow,
  profile?: Pick<ProviderProfile, 'verificationStatus' | 'category' | 'serviceArea'>,
): AdminUserListItem {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive !== false,
    createdAt: u.createdAt,
    provider: profile
      ? { verificationStatus: profile.verificationStatus, category: profile.category, serviceArea: profile.serviceArea }
      : null,
  };
}
