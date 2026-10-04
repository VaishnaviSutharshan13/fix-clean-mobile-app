// Pure helpers for provider job screens (unit-tested).
import type { ProviderJob } from '../types/providerJob';

// External maps search for the confirmed service address (no GPS tracking in
// the app — this hands off to the device's maps app).
export function mapsSearchUrl(job: Pick<ProviderJob, 'location'>): string | null {
  if (!job.location.street) return null;
  const query = `${job.location.street}, ${job.location.city}, Sri Lanka`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Headline for the Customer Location screen status chip.
export function jobStageLabel(job: Pick<ProviderJob, 'status'>): string {
  switch (job.status) {
    case 'confirmed':
      return 'CONFIRMED • READY TO DEPART';
    case 'on_the_way':
      return 'ON THE WAY TO CUSTOMER';
    case 'completed':
      return 'JOB COMPLETED';
    case 'requested':
      return 'AWAITING YOUR RESPONSE';
    case 'declined':
      return 'DECLINED';
    case 'cancelled':
      return 'CANCELLED BY CUSTOMER';
  }
}
