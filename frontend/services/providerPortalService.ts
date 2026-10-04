import type { Availability, ProviderAccount } from '../types/provider';
import type { ProviderDashboard, ProviderJob, ProviderJobAction, ProviderJobScope } from '../types/providerJob';
import { apiRequest } from './api';

export type ServicesPayload = {
  visitFee: number;
  services: { id?: string; name: string; description?: string; price: number }[];
};

// Service Provider module APIs (/provider/*). The provider is identified from
// the JWT on the server; only their own profile and bookings are returned.
export const providerPortalService = {
  me(): Promise<ProviderAccount> {
    return apiRequest<ProviderAccount>('/provider/me');
  },

  dashboard(): Promise<ProviderDashboard> {
    return apiRequest<ProviderDashboard>('/provider/dashboard');
  },

  jobs(scope: ProviderJobScope = 'all'): Promise<ProviderJob[]> {
    return apiRequest<ProviderJob[]>('/provider/bookings', { query: { scope } });
  },

  job(bookingId: string): Promise<ProviderJob> {
    return apiRequest<ProviderJob>(`/provider/bookings/${encodeURIComponent(bookingId)}`);
  },

  act(bookingId: string, action: ProviderJobAction, reason?: string): Promise<ProviderJob> {
    return apiRequest<ProviderJob>(`/provider/bookings/${encodeURIComponent(bookingId)}/${action}`, {
      method: 'PATCH',
      body: reason ? { reason } : {},
    });
  },

  // Services & Rates (proposed by the provider, approved during admin verification).
  updateServices(payload: ServicesPayload): Promise<ProviderAccount> {
    return apiRequest<ProviderAccount>('/provider/services', { method: 'PUT', body: payload });
  },

  updateAvailability(availability: Availability): Promise<ProviderAccount> {
    return apiRequest<ProviderAccount>('/provider/availability', { method: 'PUT', body: availability });
  },
};
