import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BookingStatus } from '../bookings/booking-status.js';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema.js';
import { Complaint } from '../complaints/schemas/complaint.schema.js';
import { escapeRegex } from '../providers/providers.service.js';
import { User } from '../users/schemas/user.schema.js';
import { countsBy, loadPeople } from './admin-people.js';
import type { AdminBookingDetails, AdminBookingListItem, AdminListResponse } from './admin.types.js';
import type { AdminBookingsQueryDto } from './dto/admin-queries.dto.js';

type Person = { _id: Types.ObjectId; name: string };
type PopulatedBooking = Omit<BookingDocument, 'customer' | 'provider'> & {
  customer: Person | null;
  provider: Person | null;
};

const LIST_LIMIT = 100;

// Booking Monitoring / Live Dispatch (FR8). Strictly read-only: status changes
// stay with the customer (cancel) and the provider (accept → complete).
@Injectable()
export class AdminBookingsService {
  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Complaint.name) private readonly complaintModel: Model<Complaint>,
  ) {}

  async list(
    query: AdminBookingsQueryDto,
    limit = LIST_LIMIT,
  ): Promise<AdminListResponse<AdminBookingListItem, BookingStatus>> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      const people = await this.userModel.find({ name: rx }, '_id').limit(200).lean().exec();
      const ids = people.map((p) => p._id);
      filter.$or = [
        { reference: rx },
        { 'service.name': rx },
        { 'address.city': rx },
        { customer: { $in: ids } },
        { provider: { $in: ids } },
      ];
    }

    const [bookings, rows] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate<{ customer: Person | null; provider: Person | null }>([
          { path: 'customer', select: 'name' },
          { path: 'provider', select: 'name' },
        ])
        .exec() as Promise<PopulatedBooking[]>,
      this.bookingModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
    ]);

    return { items: bookings.map(toListItem), counts: countsBy(Object.values(BookingStatus), rows) };
  }

  async details(bookingId: string): Promise<AdminBookingDetails> {
    const booking = (await this.bookingModel
      .findById(bookingId)
      .populate([
        { path: 'customer', select: 'name' },
        { path: 'provider', select: 'name' },
      ])
      .exec()) as PopulatedBooking | null;
    if (!booking) throw new NotFoundException('Booking not found');

    const [people, complaints] = await Promise.all([
      loadPeople(this.userModel, booking.statusHistory.map((h) => h.changedBy)),
      this.complaintModel.find({ booking: booking._id }, 'reference status').sort({ createdAt: -1 }).lean().exec(),
    ]);

    return {
      ...toListItem(booking),
      problemDescription: booking.problemDescription,
      pricing: {
        servicePrice: booking.pricing.servicePrice,
        visitFee: booking.pricing.visitFee,
        total: booking.pricing.total,
        currency: booking.pricing.currency,
      },
      paymentMethod: booking.paymentMethod,
      cancellationReason: booking.cancellationReason ?? null,
      statusHistory: booking.statusHistory.map((h) => ({
        status: h.status,
        changedAt: h.changedAt,
        ...(h.note ? { note: h.note } : {}),
        by: h.changedBy ? (people.get(String(h.changedBy)) ?? null) : null,
      })),
      complaints: complaints.map((c) => ({ id: String(c._id), reference: c.reference, status: c.status })),
    };
  }
}

function person(p: Person | null): { id: string; name: string } {
  return p ? { id: String(p._id), name: p.name } : { id: '', name: 'Deleted account' };
}

// Only the city is shown: the exact address is not needed for monitoring.
function toListItem(b: PopulatedBooking): AdminBookingListItem {
  const last = b.statusHistory[b.statusHistory.length - 1];
  return {
    id: b.id as string,
    reference: b.reference,
    status: b.status,
    service: { name: b.service.name, category: b.service.category },
    scheduledDate: b.scheduledDate,
    timeSlot: b.timeSlot,
    city: b.address.city,
    total: b.pricing.total,
    customer: person(b.customer),
    provider: person(b.provider),
    lastUpdate: last ? { status: last.status, changedAt: last.changedAt } : null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}
