import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { BookingStatus } from '../bookings/booking-status.js';
import {
  canTransitionComplaint,
  COMPLAINT_TRANSITIONS,
  ComplaintStatus,
} from '../complaints/complaint-status.js';
import { Complaint, ComplaintDocument } from '../complaints/schemas/complaint.schema.js';
import { escapeRegex } from '../providers/providers.service.js';
import { User } from '../users/schemas/user.schema.js';
import { countsBy, loadPeople } from './admin-people.js';
import type { AdminComplaintDetails, AdminComplaintListItem, AdminListResponse } from './admin.types.js';
import type { UpdateComplaintStatusDto } from './dto/admin-actions.dto.js';
import type { AdminComplaintsQueryDto } from './dto/admin-queries.dto.js';

type Person = { _id: Types.ObjectId; name: string };
type BookingRef = { _id: Types.ObjectId; reference: string; status: BookingStatus; service: { name: string } };
type PopulatedComplaint = Omit<ComplaintDocument, 'customer' | 'provider' | 'booking'> & {
  customer: Person | null;
  provider: Person | null;
  booking: BookingRef | null;
};

const POPULATE = [
  { path: 'customer', select: 'name' },
  { path: 'provider', select: 'name' },
  { path: 'booking', select: 'reference status service.name' },
];

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  [ComplaintStatus.Open]: 'open',
  [ComplaintStatus.InReview]: 'in review',
  [ComplaintStatus.Resolved]: 'resolved',
};

export const MIN_RESOLUTION_NOTE = 5;
const LIST_LIMIT = 100;

// Complaints / Disputes (FR8): open → in review → resolved.
@Injectable()
export class AdminComplaintsService {
  constructor(
    @InjectModel(Complaint.name) private readonly complaintModel: Model<Complaint>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async list(query: AdminComplaintsQueryDto): Promise<AdminListResponse<AdminComplaintListItem, ComplaintStatus>> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      const people = await this.userModel.find({ name: rx }, '_id').limit(200).lean().exec();
      const ids = people.map((p) => p._id);
      filter.$or = [{ reference: rx }, { subject: rx }, { customer: { $in: ids } }, { provider: { $in: ids } }];
    }

    const [complaints, counts] = await Promise.all([
      this.complaintModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
        .populate<Pick<PopulatedComplaint, 'customer' | 'provider' | 'booking'>>(POPULATE)
        .exec() as Promise<PopulatedComplaint[]>,
      this.statusCounts(),
    ]);

    return { items: complaints.map(toListItem), counts };
  }

  async statusCounts(): Promise<Record<ComplaintStatus | 'all', number>> {
    const rows = await this.complaintModel
      .aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .exec();
    return countsBy(Object.values(ComplaintStatus), rows);
  }

  async details(complaintId: string): Promise<AdminComplaintDetails> {
    const complaint = (await this.complaintModel
      .findById(complaintId)
      .populate(POPULATE)
      .exec()) as PopulatedComplaint | null;
    if (!complaint) throw new NotFoundException('Complaint not found');

    const people = await loadPeople(this.userModel, complaint.statusHistory.map((h) => h.changedBy));
    return {
      ...toListItem(complaint),
      resolutionNote: complaint.resolutionNote ?? null,
      statusHistory: complaint.statusHistory.map((h) => ({
        status: h.status,
        changedAt: h.changedAt,
        ...(h.note ? { note: h.note } : {}),
        by: h.changedBy ? (people.get(String(h.changedBy)) ?? null) : null,
      })),
      allowedTransitions: COMPLAINT_TRANSITIONS[complaint.status],
    };
  }

  async updateStatus(adminId: string, complaintId: string, dto: UpdateComplaintStatusDto): Promise<AdminComplaintDetails> {
    const current = await this.complaintModel.findById(complaintId, 'status').lean().exec();
    if (!current) throw new NotFoundException('Complaint not found');

    if (!canTransitionComplaint(current.status, dto.status)) {
      throw new ConflictException(
        `This complaint is ${STATUS_LABEL[current.status]} and can't be moved to ${STATUS_LABEL[dto.status]}.`,
      );
    }
    const resolving = dto.status === ComplaintStatus.Resolved;
    if (resolving && (dto.note?.length ?? 0) < MIN_RESOLUTION_NOTE) {
      throw new BadRequestException(
        `Add a resolution note (at least ${MIN_RESOLUTION_NOTE} characters) before resolving the complaint.`,
      );
    }

    const now = new Date();
    // Guarded on the status we validated, so concurrent updates can't skip steps.
    const updated = await this.complaintModel
      .findOneAndUpdate(
        { _id: current._id, status: current.status },
        {
          $set: {
            status: dto.status,
            ...(resolving ? { resolutionNote: dto.note, resolvedAt: now } : {}),
          },
          $push: {
            statusHistory: {
              status: dto.status,
              changedAt: now,
              changedBy: new Types.ObjectId(adminId),
              ...(dto.note ? { note: dto.note } : {}),
            },
          },
        },
      )
      .exec();
    if (!updated) throw new ConflictException('This complaint was just updated. Please refresh and try again.');
    return this.details(complaintId);
  }
}

function person(p: Person | null): { id: string; name: string } {
  return p ? { id: String(p._id), name: p.name } : { id: '', name: 'Deleted account' };
}

function toListItem(c: PopulatedComplaint): AdminComplaintListItem {
  return {
    id: c.id as string,
    reference: c.reference,
    status: c.status,
    category: c.category,
    subject: c.subject,
    description: c.description,
    customer: person(c.customer),
    provider: person(c.provider),
    booking: c.booking
      ? {
          id: String(c.booking._id),
          reference: c.booking.reference,
          status: c.booking.status,
          serviceName: c.booking.service?.name ?? '',
        }
      : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    resolvedAt: c.resolvedAt ?? null,
  };
}
