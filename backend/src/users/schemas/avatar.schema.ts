import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema.js';

export const AVATARS_COLLECTION = 'avatars';

// A user's profile photo. Stored apart from the User document so that the
// image bytes are never loaded with the user (e.g. on every authenticated request).
@Schema({ timestamps: true, collection: AVATARS_COLLECTION })
export class Avatar {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp'] })
  contentType: string;

  @Prop({ type: Buffer, required: true })
  data: Buffer;

  createdAt: Date;
  updatedAt: Date;
}

export type AvatarDocument = HydratedDocument<Avatar>;

export const AvatarSchema = SchemaFactory.createForClass(Avatar);
