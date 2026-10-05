import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomInt } from 'node:crypto';
import { Model, mongo, Types } from 'mongoose';
import { Booking } from '../bookings/schemas/booking.schema.js';
import { ComplaintCategory, ComplaintStatus } from './complaint-status.js';
import { CreateComplaintDto } from './dto/create-complaint.dto.js';
import { Complaint } from './schemas/complaint.schema.js';

export interface CustomerComplaintView {
  id: string;
  reference: string;
  bookingReference: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: Date;
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateReference(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `CP-${code}`;
}

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectModel(Complaint.name) private readonly complaintModel: Model<Complaint>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
  ) {}

  async createForCustomer(customerId: string, dto: CreateComplaintDto): Promise<CustomerComplaintView> {
    const customer = new Types.ObjectId(customerId);
    const booking = await this.bookingModel.findOne({ _id: dto.bookingId, customer }).exec();
    // Same response whether the booking doesn't exist or belongs to someone else.
    if (!booking) throw new NotFoundException('Booking not found');

    const unresolved = await this.complaintModel
      .exists({ booking: booking._id, status: { $ne: ComplaintStatus.Resolved } })
      .exec();
    if (unresolved) {
      throw new ConflictException('A complaint about this booking is already being handled.');
    }

    const now = new Date();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const complaint = await this.complaintModel.create({
          reference: generateReference(),
          customer,
          provider: booking.provider,
          booking: booking._id,
          category: dto.category,
          subject: dto.subject,
          description: dto.description,
          status: ComplaintStatus.Open,
          statusHistory: [{ status: ComplaintStatus.Open, changedAt: now, changedBy: customer }],
        });
        return {
          id: complaint.id as string,
          reference: complaint.reference,
          bookingReference: booking.reference,
          category: complaint.category,
          subject: complaint.subject,
          description: complaint.description,
          status: complaint.status,
          createdAt: complaint.createdAt,
        };
      } catch (error) {
        const duplicateReference =
          error instanceof mongo.MongoServerError &&
          error.code === 11000 &&
          JSON.stringify(error.keyPattern ?? {}).includes('reference');
        if (!duplicateReference) throw error;
      }
    }
    throw new ConflictException('Could not submit the complaint. Please try again.');
  }
}
