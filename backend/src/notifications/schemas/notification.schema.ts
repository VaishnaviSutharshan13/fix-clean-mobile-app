import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema.js';
import { NotificationType } from '../notification-type.js';

export const NOTIFICATIONS_COLLECTION = 'notifications';

// An in-app notification for one user (customer, provider or admin), created
// by the server when a real event happens (e.g. a booking status change).
@Schema({ timestamps: true, collection: NOTIFICATIONS_COLLECTION })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  recipient: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(NotificationType) })
  type: NotificationType;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  // The booking this notification is about, if any.
  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  booking?: Types.ObjectId;

  @Prop({ type: String })
  bookingReference?: string;

  @Prop({ type: Boolean, default: false })
  read: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// "My notifications, newest first" and the unread count.
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });
