import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ServiceCategory } from '../../providers/schemas/provider-profile.schema.js';
import { User } from '../../users/schemas/user.schema.js';
import { BookingStatus, PaymentMethod, TIME_SLOTS } from '../booking-status.js';

export const BOOKINGS_COLLECTION = 'bookings';

@Schema({ _id: false })
export class BookingAddress {
  @Prop({ type: String, required: true, trim: true })
  street: string;

  @Prop({ type: String, required: true, trim: true })
  city: string;

  @Prop({ type: String, trim: true, default: '' })
  landmark: string;
}

// Snapshot of the booked service, so later price/name edits by the provider
// don't change existing bookings.
@Schema({ _id: false })
export class BookedService {
  @Prop({ type: Types.ObjectId, required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, enum: Object.values(ServiceCategory) })
  category: ServiceCategory;
}

// All amounts in LKR, always calculated on the server.
@Schema({ _id: false })
export class BookingPricing {
  @Prop({ type: Number, required: true, min: 0 })
  servicePrice: number;

  @Prop({ type: Number, required: true, min: 0 })
  visitFee: number;

  @Prop({ type: Number, required: true, min: 0 })
  total: number;

  @Prop({ type: String, required: true, default: 'LKR' })
  currency: string;
}

@Schema({ _id: false })
export class StatusChange {
  @Prop({ type: String, required: true, enum: Object.values(BookingStatus) })
  status: BookingStatus;

  @Prop({ type: Date, required: true })
  changedAt: Date;

  @Prop({ type: Types.ObjectId, ref: User.name })
  changedBy?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  note?: string;
}

@Schema({ timestamps: true, collection: BOOKINGS_COLLECTION })
export class Booking {
  // Human-friendly reference shown to customers, e.g. "FC-7K2M9Q".
  @Prop({ type: String, required: true, unique: true })
  reference: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  customer: Types.ObjectId;

  // The provider's User id (same identity the provider authenticates with).
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  provider: Types.ObjectId;

  @Prop({ type: SchemaFactory.createForClass(BookedService), required: true })
  service: BookedService;

  // Calendar date in Sri Lanka time, "YYYY-MM-DD".
  @Prop({ type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  scheduledDate: string;

  @Prop({ type: String, required: true, enum: TIME_SLOTS })
  timeSlot: string;

  // Shared with the provider only once the booking is confirmed (NFR5).
  @Prop({ type: SchemaFactory.createForClass(BookingAddress), required: true })
  address: BookingAddress;

  @Prop({ type: String, required: true, trim: true })
  problemDescription: string;

  @Prop({ type: SchemaFactory.createForClass(BookingPricing), required: true })
  pricing: BookingPricing;

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    default: PaymentMethod.CashOnService,
  })
  paymentMethod: PaymentMethod;

  @Prop({
    type: String,
    enum: Object.values(BookingStatus),
    default: BookingStatus.Requested,
    index: true,
  })
  status: BookingStatus;

  @Prop({ type: [SchemaFactory.createForClass(StatusChange)], default: [] })
  statusHistory: StatusChange[];

  @Prop({ type: String, trim: true })
  cancellationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type BookingDocument = HydratedDocument<Booking>;

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.index({ customer: 1, createdAt: -1 });
BookingSchema.index({ provider: 1, status: 1 });
