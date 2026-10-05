import type {
  AdminBookingDetails,
  AdminBookingListItem,
  AdminComplaintDetails,
  AdminComplaintListItem,
  AdminDashboard,
  AdminList,
  AdminProviderDetails,
  AdminProviderListItem,
  AdminUserDetails,
  AdminUserListItem,
  ComplaintStatus,
  ProviderStatusFilter,
} from '../types/admin';
import type { BookingStatus } from '../types/booking';
import type { VerificationChecks, VerificationStatus } from '../types/provider';
import type { UserRole } from '../types/user';
import { apiRequest } from './api';

const id = (value: string) => encodeURIComponent(value);

// Admin module APIs (/admin/*). The server requires an admin JWT on every call.
export const adminService = {
  dashboard(): Promise<AdminDashboard> {
    return apiRequest<AdminDashboard>('/admin/dashboard');
  },

  providers(status: ProviderStatusFilter = 'pending', search?: string) {
    return apiRequest<AdminList<AdminProviderListItem, VerificationStatus>>('/admin/providers', {
      query: { status, search },
    });
  },

  provider(providerId: string): Promise<AdminProviderDetails> {
    return apiRequest<AdminProviderDetails>(`/admin/providers/${id(providerId)}`);
  },

  updateChecks(providerId: string, checks: Partial<VerificationChecks>): Promise<AdminProviderDetails> {
    return apiRequest<AdminProviderDetails>(`/admin/providers/${id(providerId)}/checks`, {
      method: 'PATCH',
      body: checks,
    });
  },

  approveProvider(providerId: string): Promise<AdminProviderDetails> {
    return apiRequest<AdminProviderDetails>(`/admin/providers/${id(providerId)}/verify`, { method: 'PATCH' });
  },

  rejectProvider(providerId: string, reason?: string): Promise<AdminProviderDetails> {
    return apiRequest<AdminProviderDetails>(`/admin/providers/${id(providerId)}/reject`, {
      method: 'PATCH',
      body: reason ? { reason } : {},
    });
  },

  users(filters: { role?: UserRole; status?: 'active' | 'suspended'; search?: string } = {}) {
    return apiRequest<AdminList<AdminUserListItem, UserRole | 'suspended'>>('/admin/users', { query: filters });
  },

  user(userId: string): Promise<AdminUserDetails> {
    return apiRequest<AdminUserDetails>(`/admin/users/${id(userId)}`);
  },

  setUserActive(userId: string, isActive: boolean): Promise<AdminUserDetails> {
    return apiRequest<AdminUserDetails>(`/admin/users/${id(userId)}/status`, { method: 'PATCH', body: { isActive } });
  },

  bookings(status?: BookingStatus, search?: string) {
    return apiRequest<AdminList<AdminBookingListItem, BookingStatus>>('/admin/bookings', { query: { status, search } });
  },

  booking(bookingId: string): Promise<AdminBookingDetails> {
    return apiRequest<AdminBookingDetails>(`/admin/bookings/${id(bookingId)}`);
  },

  complaints(status?: ComplaintStatus, search?: string) {
    return apiRequest<AdminList<AdminComplaintListItem, ComplaintStatus>>('/admin/complaints', {
      query: { status, search },
    });
  },

  complaint(complaintId: string): Promise<AdminComplaintDetails> {
    return apiRequest<AdminComplaintDetails>(`/admin/complaints/${id(complaintId)}`);
  },

  setComplaintStatus(complaintId: string, status: ComplaintStatus, note?: string): Promise<AdminComplaintDetails> {
    return apiRequest<AdminComplaintDetails>(`/admin/complaints/${id(complaintId)}/status`, {
      method: 'PATCH',
      body: note ? { status, note } : { status },
    });
  },
};
