import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, mongo, Types } from 'mongoose';
import { avatarPath, parseAvatarDataUrl } from './avatar.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { Avatar } from './schemas/avatar.schema.js';
import { User, UserDocument } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Avatar.name) private readonly avatarModel: Model<Avatar>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    try {
      return await this.userModel.create({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: dto.passwordHash,
        role: dto.role,
      });
    } catch (error) {
      // Unique index on email — covers concurrent registrations with the same email.
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async deleteById(id: Types.ObjectId | string): Promise<void> {
    await this.userModel.deleteOne({ _id: id }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .exec();
  }

  // Replaces the user's own profile photo. Returns the new public URL path.
  async setAvatar(userId: string, dataUrl: string): Promise<{ avatarUrl: string | null }> {
    const parsed = parseAvatarDataUrl(dataUrl);
    if ('error' in parsed) throw new BadRequestException(parsed.error);

    const user = new Types.ObjectId(userId);
    await this.avatarModel
      .updateOne({ user }, { $set: { contentType: parsed.contentType, data: parsed.data } }, { upsert: true })
      .exec();
    const now = new Date();
    await this.userModel.updateOne({ _id: user }, { $set: { avatarUpdatedAt: now } }).exec();
    return { avatarUrl: avatarPath(userId, now) };
  }

  async removeAvatar(userId: string): Promise<{ avatarUrl: null }> {
    const user = new Types.ObjectId(userId);
    await this.avatarModel.deleteOne({ user }).exec();
    await this.userModel.updateOne({ _id: user }, { $unset: { avatarUpdatedAt: 1 } }).exec();
    return { avatarUrl: null };
  }

  async getAvatar(userId: string): Promise<{ contentType: string; data: Buffer }> {
    const avatar = await this.avatarModel.findOne({ user: new Types.ObjectId(userId) }).lean().exec();
    if (!avatar) throw new NotFoundException('No profile photo');
    return { contentType: avatar.contentType, data: Buffer.from(avatar.data.buffer ?? avatar.data) };
  }
}
