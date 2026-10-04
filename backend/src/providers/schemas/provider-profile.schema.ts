import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema.js';

export enum ServiceCategory {
  Plumbing = 'plumbing',
  Electrical = 'electrical',
  Cleaning = 'cleaning',
}

// Set by administrators (FR7). Only verified providers are shown to customers (FR2).
export enum VerificationStatus {
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

export const PROVIDER_PROFILES_COLLECTION = 'providerprofiles';

@Schema({ _id: true })
export class ProviderService {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true, default: '' })
  description: string;

  // Base price in LKR for this service.
  @Prop({ type: Number, required: true, min: 0 })
  price: number;
}

export const ProviderServiceSchema = SchemaFactory.createForClass(ProviderService);

@Schema({ _id: false })
export class VerificationChecks {
  @Prop({ type: Boolean, default: false })
  identity: boolean;

  @Prop({ type: Boolean, default: false })
  contact: boolean;

  @Prop({ type: Boolean, default: false })
  experience: boolean;
}

export const VerificationChecksSchema = SchemaFactory.createForClass(VerificationChecks);

// Professional details of a service provider. The account itself (name, email,
// phone, password) lives in the User collection; this document extends it.
@Schema({ timestamps: true, collection: PROVIDER_PROFILES_COLLECTION })
export class ProviderProfile {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(ServiceCategory) })
  category: ServiceCategory;

  // Short professional title, e.g. "Licensed Master Plumber".
  @Prop({ type: String, required: true, trim: true })
  headline: string;

  @Prop({ type: String, trim: true, default: '' })
  bio: string;

  // Town/district the provider serves, e.g. "Jaffna".
  @Prop({ type: String, required: true, trim: true })
  serviceArea: string;

  @Prop({ type: Number, required: true, min: 0 })
  experienceYears: number;

  // Flat call-out fee in LKR added to every booking.
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  visitFee: number;

  @Prop({ type: [ProviderServiceSchema], default: [] })
  services: ProviderService[];

  @Prop({
    type: String,
    enum: Object.values(VerificationStatus),
    default: VerificationStatus.Pending,
  })
  verificationStatus: VerificationStatus;

  @Prop({ type: VerificationChecksSchema, default: () => ({}) })
  verificationChecks: VerificationChecks;

  @Prop({ type: Date })
  verifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type ProviderProfileDocument = HydratedDocument<ProviderProfile>;

export const ProviderProfileSchema = SchemaFactory.createForClass(ProviderProfile);

ProviderProfileSchema.index({ verificationStatus: 1, category: 1 });
