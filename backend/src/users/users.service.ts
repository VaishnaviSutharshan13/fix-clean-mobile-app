import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, mongo, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto.js';
import { User, UserDocument } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

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
}
