import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema.js';
import { ComplaintCategory, ComplaintStatus } from '../complaint-status.js';

export const COMPLAINTS_COLLECTION = 'complaints';

@Schema({ _id: false })
export class ComplaintStatusChange {
  @Prop({ type: String, required: true, enum: Object.values(ComplaintStatus) })
  status: ComplaintStatus;

  @Prop({ type: Date, required: true })
  changedAt: Date;

  @Prop({ type: Types.ObjectId, ref: User.name })
  changedBy?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  note?: string;
}

// A customer's complaint about one of their bookings (dispute with the provider).
@Schema({ timestamps: true, collection: COMPLAINTS_COLLECTION })
export class Complaint {
  // Human-friendly reference, e.g. "CP-7K2M9Q".
  @Prop({ type: String, required: true, unique: true })
  reference: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  customer: Types.ObjectId;

  // The provider's User id, taken from the booking.
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  provider: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  booking: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(ComplaintCategory) })
  category: ComplaintCategory;

  @Prop({ type: String, required: true, trim: true })
  subject: string;

  @Prop({ type: String, required: true, trim: true })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(ComplaintStatus),
    default: ComplaintStatus.Open,
    index: true,
  })
  status: ComplaintStatus;

  @Prop({ type: [SchemaFactory.createForClass(ComplaintStatusChange)], default: [] })
  statusHistory: ComplaintStatusChange[];

  // Outcome recorded by the administrator when resolving.
  @Prop({ type: String, trim: true })
  resolutionNote?: string;

  @Prop({ type: Date })
  resolvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type ComplaintDocument = HydratedDocument<Complaint>;

export const ComplaintSchema = SchemaFactory.createForClass(Complaint);

ComplaintSchema.index({ status: 1, createdAt: -1 });
