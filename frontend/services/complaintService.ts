import type { ComplaintCategory, ComplaintStatus } from '../types/admin';
import { apiRequest } from './api';

export type CreateComplaintPayload = {
  bookingId: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
};

export type SubmittedComplaint = {
  id: string;
  reference: string;
  bookingReference: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
};

// Customer complaint submission (POST /complaints). Complaints are managed by
// administrators on the Admin Complaints / Disputes screen.
export const complaintService = {
  create(payload: CreateComplaintPayload): Promise<SubmittedComplaint> {
    return apiRequest<SubmittedComplaint>('/complaints', { method: 'POST', body: payload });
  },
};
