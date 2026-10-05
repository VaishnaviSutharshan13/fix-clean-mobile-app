import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { ac } from '../constants/adminTheme';
import type { CheckKey, ComplaintCategory, ComplaintStatus, ProviderStatusFilter } from '../types/admin';
import type { BookingStatus } from '../types/booking';
import type { VerificationChecks, VerificationStatus } from '../types/provider';
import type { UserRole } from '../types/user';

// Pure helpers for the Admin screens (no React Native imports, unit-tested).

type IconName = ComponentProps<typeof Ionicons>['name'];
export type PillMeta = { label: string; fg: string; bg: string; icon: IconName };

// Chip colours from the Admin Figma (tonal palette in constants/adminTheme).
export const VERIFICATION_META: Record<VerificationStatus, PillMeta> = {
  pending: { label: 'Pending', fg: ac.tertiary, bg: ac.tertiaryContainer, icon: 'hourglass-outline' },
  verified: { label: 'Verified', fg: ac.onSuccessBright, bg: ac.successBright, icon: 'shield-checkmark-outline' },
  rejected: { label: 'Rejected', fg: ac.onErrorContainer, bg: ac.errorContainer, icon: 'close-circle-outline' },
};

export const COMPLAINT_STATUS_META: Record<ComplaintStatus, PillMeta> = {
  open: { label: 'Open', fg: ac.onErrorContainer, bg: ac.errorContainer, icon: 'alert-circle-outline' },
  in_review: { label: 'In Review', fg: ac.tertiary, bg: ac.tertiaryContainer, icon: 'search-outline' },
  resolved: { label: 'Resolved', fg: ac.onSuccessBright, bg: ac.successBright, icon: 'checkmark-done-outline' },
};

// Booking status chips for the Admin screens (same labels as the customer app).
export const ADMIN_BOOKING_META: Record<BookingStatus, PillMeta> = {
  requested: { label: 'Requested', fg: ac.tertiary, bg: ac.tertiaryContainer, icon: 'time-outline' },
  confirmed: { label: 'Confirmed', fg: ac.primary, bg: ac.primaryFixed, icon: 'checkmark-circle-outline' },
  on_the_way: { label: 'On the Way', fg: ac.primary, bg: ac.primaryFixed, icon: 'car-outline' },
  completed: { label: 'Completed', fg: ac.onSuccessBright, bg: ac.successBright, icon: 'checkmark-done-outline' },
  declined: { label: 'Declined', fg: ac.onErrorContainer, bg: ac.errorContainer, icon: 'close-circle-outline' },
  cancelled: { label: 'Cancelled', fg: ac.onErrorContainer, bg: ac.errorContainer, icon: 'ban-outline' },
};

// Coloured top border of booking / complaint cards (Figma 1:2430).
export const BOOKING_ACCENT: Record<BookingStatus, string> = {
  requested: ac.amber,
  confirmed: ac.primary,
  on_the_way: ac.primary,
  completed: ac.success,
  declined: ac.error,
  cancelled: ac.error,
};

export const COMPLAINT_ACCENT: Record<ComplaintStatus, string> = {
  open: ac.error,
  in_review: ac.amber,
  resolved: ac.success,
};

export const COMPLAINT_CATEGORY_LABEL: Record<ComplaintCategory, string> = {
  service_quality: 'Service quality',
  no_show: 'Late / no-show',
  pricing: 'Pricing',
  behaviour: 'Behaviour',
  damage: 'Property damage',
  other: 'Other',
};

export const ROLE_META: Record<UserRole, PillMeta> = {
  customer: { label: 'Customer', fg: ac.primary, bg: ac.containerHigh, icon: 'person-outline' },
  provider: { label: 'Provider', fg: ac.tertiary, bg: ac.tertiaryContainer, icon: 'construct-outline' },
  admin: { label: 'Admin', fg: ac.dark, bg: ac.chipMuted, icon: 'shield-outline' },
};

export const ACTIVE_META: PillMeta = {
  label: 'Active',
  fg: ac.onSuccessBright,
  bg: ac.successBright,
  icon: 'checkmark-circle-outline',
};

export const SUSPENDED_META: PillMeta = {
  label: 'Suspended',
  fg: ac.onErrorContainer,
  bg: ac.errorContainer,
  icon: 'ban-outline',
};

// Short display id derived from a MongoDB id, e.g. "#PRO-A1B2C3" (Figma shows
// "#PF-904" style references; these are real ids, just shortened).
export function shortRef(prefix: string, id: string): string {
  return `#${prefix}-${id.slice(-6).toUpperCase()}`;
}

// Admin review checklist. These record the administrator's own confirmation
// (FR7); the app does not perform automated identity checks or store documents.
export const CHECK_ITEMS: { key: CheckKey; label: string; hint: string }[] = [
  { key: 'identity', label: 'Identity', hint: 'Name and person confirmed by the administrator' },
  { key: 'contact', label: 'Contact', hint: 'Phone number and email confirmed as reachable' },
  { key: 'experience', label: 'Experience', hint: 'Trade and years of experience confirmed' },
];

export function confirmedCheckCount(checks: VerificationChecks): number {
  return CHECK_ITEMS.filter((item) => checks[item.key]).length;
}

export function allChecksConfirmed(checks: VerificationChecks): boolean {
  return confirmedCheckCount(checks) === CHECK_ITEMS.length;
}

// Filter chips, in display order. `undefined` means "All".
export const PROVIDER_FILTERS: { key: ProviderStatusFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export const BOOKING_FILTERS: (BookingStatus | undefined)[] = [
  undefined,
  'requested',
  'confirmed',
  'on_the_way',
  'completed',
  'declined',
  'cancelled',
];

export const COMPLAINT_FILTERS: { key: ComplaintStatus | undefined; label: string }[] = [
  { key: undefined, label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_review', label: 'In Review' },
  { key: 'resolved', label: 'Resolved' },
];

export type UserFilter = 'all' | UserRole | 'suspended';

export const USER_FILTERS: { key: UserFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'customer', label: 'Customers' },
  { key: 'provider', label: 'Providers' },
  { key: 'admin', label: 'Admins' },
  { key: 'suspended', label: 'Suspended' },
];

// Maps a user filter chip to the API query.
export function userFilterQuery(filter: UserFilter): { role?: UserRole; status?: 'suspended' } {
  if (filter === 'all') return {};
  if (filter === 'suspended') return { status: 'suspended' };
  return { role: filter };
}

export function withCount(label: string, count: number | undefined): string {
  return count === undefined ? label : `${label} (${count})`;
}

// Complaint actions offered for the transitions the server allows.
export const COMPLAINT_ACTION_LABEL: Record<ComplaintStatus, string> = {
  open: 'Reopen',
  in_review: 'Start Review',
  resolved: 'Resolve',
};

export const MIN_RESOLUTION_NOTE = 5;
export const MAX_NOTE = 500;
export const MAX_REJECTION_REASON = 300;

// Mirrors the server rule: a resolution note is required to resolve.
export function validateComplaintNote(to: ComplaintStatus, note: string): string | undefined {
  const trimmed = note.trim();
  if (trimmed.length > MAX_NOTE) return `Note must be at most ${MAX_NOTE} characters.`;
  if (to === 'resolved' && trimmed.length < MIN_RESOLUTION_NOTE) {
    return `Add a resolution note (at least ${MIN_RESOLUTION_NOTE} characters) before resolving.`;
  }
  return undefined;
}

export function validateRejectionReason(reason: string): string | undefined {
  return reason.trim().length > MAX_REJECTION_REASON
    ? `Reason must be at most ${MAX_REJECTION_REASON} characters.`
    : undefined;
}

export function formatExperience(years: number): string {
  if (years <= 0) return 'Under 1 yr';
  return years === 1 ? '1 yr' : `${years} yrs`;
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

// Result messages shown on the Approval / Rejection Confirmation screen.
export function verificationOutcome(action: 'approve' | 'reject', name: string): { title: string; message: string } {
  return action === 'approve'
    ? {
        title: 'Provider verified',
        message: `${name} is now verified. Customers can find, view and book them (subject to their availability).`,
      }
    : {
        title: 'Application rejected',
        message: `${name} has been notified in their provider portal and stays hidden from customers.`,
      };
}
