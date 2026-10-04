import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema.js';

export const REVIEWS_COLLECTION = 'reviews';

// A customer's rating of a provider for one completed booking (FR1).
@Schema({ timestamps: true, collection: REVIEWS_COLLECTION })
export class Review {
  // One review per booking.
  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, unique: true })
  booking: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  provider: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, trim: true, default: '' })
  comment: string;

  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<Review>;

export const ReviewSchema = SchemaFactory.createForClass(Review);
