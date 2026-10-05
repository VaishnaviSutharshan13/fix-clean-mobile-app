import type { BookingStatus } from '../bookings/booking-status.js';
import type { ComplaintCategory, ComplaintStatus } from '../complaints/complaint-status.js';
import type { AvailabilityView } from '../providers/availability.js';
import type { ProviderServiceView, VerificationChecksView } from '../providers/providers.types.js';
import type { ServiceCategory, VerificationStatus } from '../providers/schemas/provider-profile.schema.js';
import type { Role } from '../users/schemas/user.schema.js';

// Response shapes of the Admin API (/admin/*). They are built field by field,
// so password hashes and other internal fields can never be included.

export interface AdminListResponse<T, K extends string> {
  items: T[];
  // Totals per filter value (ignoring the search text), for the filter chips.
  counts: Record<K | 'all', number>;
}

export interface PersonRef {
  id: string;
  name: string;
}

export interface AdminDashboardView {
  users: { total: number; customers: number; providers: number; admins: number; suspended: number };
  providers: { pending: number; verified: number; rejected: number; bookable: number };
  bookings: {
    total: number;
    active: number;
    completed: number;
    cancelledOrDeclined: number;
    byStatus: Record<BookingStatus, number>;
  };
  complaints: { open: number; inReview: number; resolved: number; unresolved: number };
  // Oldest pending applications first (review queue).
  pendingVerifications: AdminProviderListItem[];
  recentBookings: AdminBookingListItem[];
  generatedAt: Date;
}

export interface AdminProviderListItem {
  id: string; // provider's User id (same id customers book with)
  name: string;
  category: ServiceCategory;
  headline: string;
  serviceArea: string;
  experienceYears: number;
  verificationStatus: VerificationStatus;
  servicesCount: number;
  startingPrice: number | null;
  verificationChecks: VerificationChecksView;
  accountActive: boolean;
  submittedAt: Date;
  reviewedAt: Date | null;
}

export interface AdminProviderDetails extends AdminProviderListItem {
  email: string;
  phone: string;
  bio: string;
  visitFee: number;
  services: ProviderServiceView[];
  availability: AvailabilityView;
  availabilityUpdatedAt: Date | null;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  reviewedBy: string | null;
  servicesUpdatedAt: Date | null;
  // True when a verified provider edited Services & Rates after approval.
  servicesChangedSinceApproval: boolean;
  bookingStats: { total: number; active: number; completed: number };
  approval: { ready: boolean; problems: string[] };
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  // Present for provider accounts.
  provider: { verificationStatus: VerificationStatus; category: ServiceCategory; serviceArea: string } | null;
}

export interface AdminUserDetails extends AdminUserListItem {
  suspendedAt: Date | null;
  bookingStats: { total: number; active: number; completed: number; cancelledOrDeclined: number };
  complaintCount: number;
  // False for the signed-in admin and for other administrators.
  canChangeStatus: boolean;
}

export interface AdminBookingListItem {
  id: string;
  reference: string;
  status: BookingStatus;
  service: { name: string; category: ServiceCategory };
  scheduledDate: string;
  timeSlot: string;
  city: string;
  total: number;
  customer: PersonRef;
  provider: PersonRef;
  lastUpdate: { status: BookingStatus; changedAt: Date } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineEntry<S extends string> {
  status: S;
  changedAt: Date;
  note?: string;
  by: { name: string; role: Role } | null;
}

export interface AdminBookingDetails extends AdminBookingListItem {
  problemDescription: string;
  pricing: { servicePrice: number; visitFee: number; total: number; currency: string };
  paymentMethod: string;
  cancellationReason: string | null;
  statusHistory: TimelineEntry<BookingStatus>[];
  complaints: { id: string; reference: string; status: ComplaintStatus }[];
}

export interface AdminComplaintListItem {
  id: string;
  reference: string;
  status: ComplaintStatus;
  category: ComplaintCategory;
  subject: string;
  description: string;
  customer: PersonRef;
  provider: PersonRef;
  booking: { id: string; reference: string; status: BookingStatus; serviceName: string } | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface AdminComplaintDetails extends AdminComplaintListItem {
  resolutionNote: string | null;
  statusHistory: TimelineEntry<ComplaintStatus>[];
  allowedTransitions: ComplaintStatus[];
}
