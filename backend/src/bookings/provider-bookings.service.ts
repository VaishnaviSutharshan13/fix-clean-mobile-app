import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { sriLankaNow } from './booking-dates.js';
import { BookingStatus, canTransition, TIME_SLOTS } from './booking-status.js';
import type { ProviderBookingView, ProviderDashboardView } from './provider-bookings.types.js';
import { Booking, BookingDocument } from './schemas/booking.schema.js';

type PopulatedCustomer = { _id: Types.ObjectId; name: string; phone: string };
type ProviderBooking = Omit<BookingDocument, 'customer'> & { customer: PopulatedCustomer };

export type ProviderAction = 'accept' | 'decline' | 'on-the-way' | 'complete';
export type ProviderBookingScope = 'requests' | 'active' | 'history' | 'all';

// Provider-owned transitions: action → [required current status, new status].
// They are a subset of BOOKING_TRANSITIONS, which customers share.
const ACTION_TRANSITIONS: Record<ProviderAction, [BookingStatus, BookingStatus]> = {
  accept: [BookingStatus.Requested, BookingStatus.Confirmed],
  decline: [BookingStatus.Requested, BookingStatus.Declined],
  'on-the-way': [BookingStatus.Confirmed, BookingStatus.OnTheWay],
  complete: [BookingStatus.OnTheWay, BookingStatus.Completed],
};

// NFR5: exact address and customer phone are shared only after confirmation.
const CONTACT_SHARED_STATUSES = [BookingStatus.Confirmed, BookingStatus.OnTheWay, BookingStatus.Completed];

const SCOPE_STATUSES: Record<ProviderBookingScope, BookingStatus[] | null> = {
  requests: [BookingStatus.Requested],
  active: [BookingStatus.Confirmed, BookingStatus.OnTheWay],
  history: [BookingStatus.Completed, BookingStatus.Declined, BookingStatus.Cancelled],
  all: null,
};

// Sort by date, then by arrival window (TIME_SLOTS are in chronological order).
function bySchedule(a: { scheduledDate: string; timeSlot: string }, b: { scheduledDate: string; timeSlot: string }) {
  if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate < b.scheduledDate ? -1 : 1;
  return TIME_SLOTS.indexOf(a.timeSlot as never) - TIME_SLOTS.indexOf(b.timeSlot as never);
}

@Injectable()
export class ProviderBookingsService {
  constructor(@InjectModel(Booking.name) private readonly bookingModel: Model<Booking>) {}

  async list(providerId: string, scope: ProviderBookingScope): Promise<ProviderBookingView[]> {
    const filter: Record<string, unknown> = { provider: new Types.ObjectId(providerId) };
    const statuses = SCOPE_STATUSES[scope];
    if (statuses) filter.status = { $in: statuses };

    const bookings = await this.find(filter, 100);
    const views = bookings.map(toProviderView);
    // Requests and active jobs are worked through in schedule order.
    if (scope === 'requests' || scope === 'active') views.sort(bySchedule);
    return views;
  }

  async findOne(providerId: string, bookingId: string): Promise<ProviderBookingView> {
    const [booking] = await this.find({ _id: bookingId, provider: new Types.ObjectId(providerId) }, 1);
    // Same response whether the booking doesn't exist or belongs to another provider.
    if (!booking) throw new NotFoundException('Booking not found');
    return toProviderView(booking);
  }

  async perform(
    providerId: string,
    bookingId: string,
    action: ProviderAction,
    reason?: string,
  ): Promise<ProviderBookingView> {
    const [from, to] = ACTION_TRANSITIONS[action];
    const providerObjectId = new Types.ObjectId(providerId);

    // Atomic: only succeeds if the booking is still in the expected status, so
    // double taps or two devices can't apply the same transition twice.
    const updated = await this.bookingModel
      .findOneAndUpdate(
        { _id: bookingId, provider: providerObjectId, status: from },
        {
          $set: {
            status: to,
            ...(to === BookingStatus.Declined && reason ? { cancellationReason: reason } : {}),
          },
          $push: {
            statusHistory: {
              status: to,
              changedAt: new Date(),
              changedBy: providerObjectId,
              ...(reason ? { note: reason } : {}),
            },
          },
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!updated) {
      const current = await this.bookingModel
        .findOne({ _id: bookingId, provider: providerObjectId }, 'status')
        .exec();
      if (!current) throw new NotFoundException('Booking not found');
      throw new ConflictException(
        canTransition(current.status, to)
          ? 'This booking was just updated. Please refresh and try again.'
          : `This booking is ${current.status.replace(/_/g, ' ')} and can't be changed that way.`,
      );
    }

    return this.findOne(providerId, bookingId);
  }

  async dashboard(providerId: string): Promise<ProviderDashboardView> {
    const provider = new Types.ObjectId(providerId);
    const today = sriLankaNow().date;

    const [pendingRequests, completedJobs, activeJobs, todays, upcoming, recent] = await Promise.all([
      this.bookingModel.countDocuments({ provider, status: BookingStatus.Requested }).exec(),
      this.bookingModel.countDocuments({ provider, status: BookingStatus.Completed }).exec(),
      this.bookingModel
        .countDocuments({ provider, status: { $in: [BookingStatus.Confirmed, BookingStatus.OnTheWay] } })
        .exec(),
      this.bookingModel
        .find({
          provider,
          scheduledDate: today,
          status: { $in: [BookingStatus.Confirmed, BookingStatus.OnTheWay, BookingStatus.Completed] },
        })
        .lean()
        .exec(),
      this.find(
        {
          provider,
          status: { $in: [BookingStatus.Confirmed, BookingStatus.OnTheWay] },
          scheduledDate: { $gte: today },
        },
        50,
      ),
      this.find({ provider, status: BookingStatus.Requested }, 50),
    ]);

    const completedToday = todays.filter((b) => b.status === BookingStatus.Completed);
    const upcomingViews = upcoming.map(toProviderView).sort(bySchedule);
    // A job already on the way is always the "next" one.
    const nextJob =
      upcomingViews.find((b) => b.status === BookingStatus.OnTheWay) ?? upcomingViews[0] ?? null;

    return {
      pendingRequests,
      todayJobs: todays.length,
      todayCompleted: completedToday.length,
      todayEarnings: completedToday.reduce((sum, b) => sum + b.pricing.total, 0),
      activeJobs,
      completedJobs,
      nextJob,
      upcomingJobs: upcomingViews.filter((b) => b.id !== nextJob?.id).slice(0, 5),
      recentRequests: recent.map(toProviderView).sort(bySchedule).slice(0, 3),
    };
  }

  private find(filter: Record<string, unknown>, limit: number): Promise<ProviderBooking[]> {
    return this.bookingModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate<{ customer: PopulatedCustomer }>('customer', 'name phone')
      .exec() as Promise<ProviderBooking[]>;
  }
}

function toProviderView(b: ProviderBooking): ProviderBookingView {
  const shared = CONTACT_SHARED_STATUSES.includes(b.status);
  const is = (status: BookingStatus) => b.status === status;
  return {
    id: b.id as string,
    reference: b.reference,
    status: b.status,
    statusHistory: b.statusHistory.map((h) => ({
      status: h.status,
      changedAt: h.changedAt,
      ...(h.note ? { note: h.note } : {}),
    })),
    service: { id: String(b.service.serviceId), name: b.service.name, category: b.service.category },
    scheduledDate: b.scheduledDate,
    timeSlot: b.timeSlot,
    problemDescription: b.problemDescription,
    pricing: {
      servicePrice: b.pricing.servicePrice,
      visitFee: b.pricing.visitFee,
      total: b.pricing.total,
      currency: b.pricing.currency,
    },
    paymentMethod: b.paymentMethod,
    customer: {
      name: b.customer?.name ?? 'Customer',
      ...(shared && b.customer?.phone ? { phone: b.customer.phone } : {}),
    },
    location: {
      city: b.address.city,
      ...(shared ? { street: b.address.street, landmark: b.address.landmark ?? '' } : {}),
    },
    contactShared: shared,
    ...(b.cancellationReason ? { cancellationReason: b.cancellationReason } : {}),
    actions: {
      accept: is(BookingStatus.Requested),
      decline: is(BookingStatus.Requested),
      startTrip: is(BookingStatus.Confirmed),
      complete: is(BookingStatus.OnTheWay),
    },
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

