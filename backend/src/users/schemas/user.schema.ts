import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum Role {
  Customer = 'customer',
  Provider = 'provider',
  Admin = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true, trim: true })
  phone: string;

  // bcrypt hash. Excluded from queries by default; select('+password') when it's needed.
  @Prop({ type: String, required: true, select: false })
  password: string;

  @Prop({ type: String, required: true, enum: Object.values(Role), default: Role.Customer })
  role: Role;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);

// Never serialise the password hash, even if it was explicitly selected.
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const { password: _password, ...safe } = ret;
    return safe;
  },
});
