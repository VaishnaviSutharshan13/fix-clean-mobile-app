import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomInt } from 'node:crypto';
import { Model, mongo, Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service.js';
import { avatarPath } from '../users/avatar.js';
import { availabilityProblem, normalizeAvailability } from '../providers/availability.js';
import { ProvidersService } from '../providers/providers.service.js';
import { ProviderProfileDocument } from '../providers/schemas/provider-profile.schema.js';
import { validateSchedule } from './booking-dates.js';
import {
  ACTIVE_BOOKING_STATUSES,
  BookingStatus,
  canTransition,
  type TimeSlot,
} from './booking-status.js';
import type { CustomerBookingView } from './bookings.types.js';
import { CancelBookingDto } from './dto/cancel-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { Booking, BookingDocument } from './schemas/booking.schema.js';

type PopulatedProvider = { _id: Types.ObjectId; name: string; phone: string; avatarUpdatedAt?: Date };

// Provider contact details are only revealed after the provider confirms.
const PHONE_VISIBLE_STATUSES = [
  BookingStatus.Confirmed,
  BookingStatus.OnTheWay,
  BookingStatus.Completed,
];

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateReference(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `FC-${code}`;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    private readonly providersService: ProvidersService,
    private readonly notifications: NotificationsService,
  ) {}

  async createForCustomer(customerId: string, dto: CreateBookingDto): Promise<CustomerBookingView> {
    const profile = await this.providersService.findVerifiedProfile(dto.providerId);
    if (!profile) {
      throw new NotFoundException('This provider is not available for booking');
    }

    const service = this.findService(profile, dto.serviceId);
    this.assertSchedule(dto.scheduledDate, dto.timeSlot);
    this.assertProviderAvailable(profile, dto.scheduledDate, dto.timeSlot);

    const now = new Date();
    const customer = new Types.ObjectId(customerId);

    // Retry in the unlikely event of a reference collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const booking = await this.bookingModel.create({
          reference: generateReference(),
          customer,
          provider: profile.user,
          service: { serviceId: service._id, name: service.name, category: profile.category },
          scheduledDate: dto.scheduledDate,
          timeSlot: dto.timeSlot,
          address: {
            street: dto.address.street,
            city: dto.address.city,
            landmark: dto.address.landmark ?? '',
          },
          problemDescription: dto.problemDescription,
          pricing: {
            servicePrice: service.price,
            visitFee: profile.visitFee,
            total: service.price + profile.visitFee,
            currency: 'LKR',
          },
          status: BookingStatus.Requested,
          statusHistory: [{ status: BookingStatus.Requested, changedAt: now, changedBy: customer }],
        });
        await this.notifications.notifyBookingStatus(booking, BookingStatus.Requested);
        return this.findOneForCustomer(customerId, booking.id as string);
      } catch (error) {
        const duplicateReference =
          error instanceof mongo.MongoServerError &&
          error.code === 11000 &&
          JSON.stringify(error.keyPattern ?? {}).includes('reference');
        if (!duplicateReference) throw error;
      }
    }
    throw new ConflictException('Could not create the booking. Please try again.');
  }

  async listForCustomer(customerId: string, scope: 'all' | 'active' = 'all'): Promise<CustomerBookingView[]> {
    const filter: Record<string, unknown> = { customer: new Types.ObjectId(customerId) };
    if (scope === 'active') filter.status = { $in: ACTIVE_BOOKING_STATUSES };

    const bookings = await this.bookingModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate<{ provider: PopulatedProvider }>('provider', 'name phone avatarUpdatedAt')
      .exec();

    return this.toCustomerViews(bookings);
  }

  async findOneForCustomer(customerId: string, bookingId: string): Promise<CustomerBookingView> {
    const booking = await this.bookingModel
      .findOne({ _id: bookingId, customer: new Types.ObjectId(customerId) })
      .populate<{ provider: PopulatedProvider }>('provider', 'name phone avatarUpdatedAt')
      .exec();

    // Same response whether the booking doesn't exist or belongs to someone else.
    if (!booking) throw new NotFoundException('Booking not found');

    const [view] = await this.toCustomerViews([booking]);
    return view!;
  }

  async updateForCustomer(
    customerId: string,
    bookingId: string,
    dto: UpdateBookingDto,
  ): Promise<CustomerBookingView> {
    const booking = await this.getOwnedBooking(customerId, bookingId);

    if (booking.status !== BookingStatus.Requested) {
      throw new ConflictException(
        'This booking can no longer be changed because the provider has already responded.',
      );
    }

    const date = dto.scheduledDate ?? booking.scheduledDate;
    const slot = (dto.timeSlot ?? booking.timeSlot) as TimeSlot;
    if (dto.scheduledDate || dto.timeSlot) {
      this.assertSchedule(date, slot);
      const current = await this.providersService.findVerifiedProfile(String(booking.provider));
      if (!current) throw new NotFoundException('This provider is no longer available');
      this.assertProviderAvailable(current, date, slot);
    }

    if (dto.serviceId) {
      const profile = await this.providersService.findVerifiedProfile(String(booking.provider));
      if (!profile) throw new NotFoundException('This provider is no longer available');
      const service = this.findService(profile, dto.serviceId);
      booking.service = { serviceId: service._id, name: service.name, category: profile.category };
      booking.pricing = {
        servicePrice: service.price,
        visitFee: profile.visitFee,
        total: service.price + profile.visitFee,
        currency: 'LKR',
      };
    }

    booking.scheduledDate = date;
    booking.timeSlot = slot;
    if (dto.address) {
      booking.address = {
        street: dto.address.street,
        city: dto.address.city,
        landmark: dto.address.landmark ?? '',
      };
    }
    if (dto.problemDescription) booking.problemDescription = dto.problemDescription;

    await booking.save();
    return this.findOneForCustomer(customerId, bookingId);
  }

  async cancelForCustomer(
    customerId: string,
    bookingId: string,
    dto: CancelBookingDto,
  ): Promise<CustomerBookingView> {
    const booking = await this.getOwnedBooking(customerId, bookingId);

    if (!canTransition(booking.status, BookingStatus.Cancelled)) {
      throw new ConflictException('This booking can no longer be cancelled.');
    }

    booking.status = BookingStatus.Cancelled;
    booking.cancellationReason = dto.reason || undefined;
    booking.statusHistory.push({
      status: BookingStatus.Cancelled,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(customerId),
      note: dto.reason || undefined,
    });

    await booking.save();
    await this.notifications.notifyBookingStatus(booking, BookingStatus.Cancelled);
    return this.findOneForCustomer(customerId, bookingId);
  }

  private async getOwnedBooking(customerId: string, bookingId: string): Promise<BookingDocument> {
    const booking = await this.bookingModel
      .findOne({ _id: bookingId, customer: new Types.ObjectId(customerId) })
      .exec();
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private findService(profile: ProviderProfileDocument, serviceId: string) {
    const service = profile.services.find((s) => String(s._id) === serviceId);
    if (!service) {
      throw new BadRequestException('The selected service is not offered by this provider');
    }
    return service;
  }

  // FR5: respect the provider's duty status, working days and shift windows.
  private assertProviderAvailable(profile: ProviderProfileDocument, date: string, slot: string): void {
    const problem = availabilityProblem(normalizeAvailability(profile.availability), date, slot);
    if (problem) throw new ConflictException(problem);
  }

  private assertSchedule(date: string, slot: TimeSlot): void {
    const problem = validateSchedule(date, slot);
    if (problem) throw new BadRequestException(problem);
  }

  private async toCustomerViews(
    bookings: (Omit<BookingDocument, 'provider'> & { provider: PopulatedProvider })[],
  ): Promise<CustomerBookingView[]> {
    const profiles = await this.providersService.findProfilesByUserIds(
      bookings.map((b) => b.provider._id),
    );
    const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));

    return bookings.map((b) => {
      const profile = profileByUser.get(String(b.provider._id));
      return {
        id: b.id as string,
        reference: b.reference,
        status: b.status,
        statusHistory: b.statusHistory.map((h) => ({
          status: h.status,
          changedAt: h.changedAt,
          ...(h.note ? { note: h.note } : {}),
        })),
        service: {
          id: String(b.service.serviceId),
          name: b.service.name,
          category: b.service.category,
        },
        scheduledDate: b.scheduledDate,
        timeSlot: b.timeSlot,
        address: {
          street: b.address.street,
          city: b.address.city,
          landmark: b.address.landmark ?? '',
        },
        problemDescription: b.problemDescription,
        pricing: {
          servicePrice: b.pricing.servicePrice,
          visitFee: b.pricing.visitFee,
          total: b.pricing.total,
          currency: b.pricing.currency,
        },
        paymentMethod: b.paymentMethod,
        ...(b.cancellationReason ? { cancellationReason: b.cancellationReason } : {}),
        provider: {
          id: String(b.provider._id),
          name: b.provider.name,
          headline: profile?.headline ?? '',
          serviceArea: profile?.serviceArea ?? '',
          ...(PHONE_VISIBLE_STATUSES.includes(b.status) ? { phone: b.provider.phone } : {}),
          avatarUrl: avatarPath(String(b.provider._id), b.provider.avatarUpdatedAt),
        },
        canModify: b.status === BookingStatus.Requested,
        canCancel: canTransition(b.status, BookingStatus.Cancelled),
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });
  }
}
