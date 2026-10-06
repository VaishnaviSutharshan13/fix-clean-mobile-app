import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { BookingStatus } from '../bookings/booking-status.js';
import type { Booking } from '../bookings/schemas/booking.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { bookingNotification, verificationNotification } from './notification-messages.js';
import type { NotificationListResponse, NotificationView } from './notifications.types.js';
import { Notification, NotificationDocument } from './schemas/notification.schema.js';

const LIST_LIMIT = 50;

type BookingLike = Pick<
  Booking,
  'reference' | 'customer' | 'provider' | 'service' | 'scheduledDate' | 'timeSlot' | 'pricing'
> & { _id: Types.ObjectId };

// Notification Management: users read their own notifications and mark them
// read / unread. Other modules call the notify* methods after a successful
// action; those never throw, so a notification problem can't undo or fail
// the booking / verification change that has already been saved.
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async listForUser(userId: string, bookingId?: string): Promise<NotificationListResponse> {
    const recipient = new Types.ObjectId(userId);
    const filter: Record<string, unknown> = { recipient };
    if (bookingId) filter.booking = new Types.ObjectId(bookingId);

    const [items, unreadCount] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1, _id: -1 }).limit(LIST_LIMIT).exec(),
      this.notificationModel.countDocuments({ recipient, read: false }).exec(),
    ]);
    return { items: items.map(toView), unreadCount };
  }

  async setRead(userId: string, notificationId: string, read: boolean): Promise<NotificationView> {
    // The recipient is part of the filter, so another user's notification is
    // never changed and gets the same 404 as one that doesn't exist.
    const updated = await this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, recipient: new Types.ObjectId(userId) },
        read ? { $set: { read: true, readAt: new Date() } } : { $set: { read: false }, $unset: { readAt: 1 } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) throw new NotFoundException('Notification not found');
    return toView(updated);
  }

  // Booking moved to `status` (created, accepted, declined, cancelled, ...).
  async notifyBookingStatus(booking: BookingLike, status: BookingStatus): Promise<void> {
    try {
      const people = await this.userModel
        .find({ _id: { $in: [booking.customer, booking.provider] } }, 'name')
        .lean()
        .exec();
      const nameOf = (id: Types.ObjectId) => people.find((p) => String(p._id) === String(id))?.name;

      const content = bookingNotification(status, {
        reference: booking.reference,
        serviceName: booking.service.name,
        scheduledDate: booking.scheduledDate,
        timeSlot: booking.timeSlot,
        total: booking.pricing.total,
        customerName: nameOf(booking.customer) ?? 'A customer',
        providerName: nameOf(booking.provider) ?? 'Your provider',
      });
      if (!content) return;

      await this.notificationModel.create({
        recipient: content.to === 'customer' ? booking.customer : booking.provider,
        type: content.type,
        title: content.title,
        message: content.message,
        booking: booking._id,
        bookingReference: booking.reference,
      });
    } catch (error) {
      this.logger.warn(`Could not create a notification for booking ${booking.reference}: ${String(error)}`);
    }
  }

  // Admin approved or rejected a provider application.
  async notifyProviderVerification(providerUserId: string, verified: boolean, reason?: string): Promise<void> {
    try {
      await this.notificationModel.create({
        recipient: new Types.ObjectId(providerUserId),
        ...verificationNotification(verified, reason),
      });
    } catch (error) {
      this.logger.warn(`Could not create a verification notification for ${providerUserId}: ${String(error)}`);
    }
  }
}

function toView(n: NotificationDocument): NotificationView {
  return {
    id: n.id as string,
    type: n.type,
    title: n.title,
    message: n.message,
    bookingId: n.booking ? String(n.booking) : null,
    bookingReference: n.bookingReference ?? null,
    read: n.read,
    readAt: n.readAt ?? null,
    createdAt: n.createdAt,
  };
}
