import type { Href } from 'expo-router';

import { ApiError } from '../services/api';
import type { UserRole } from '../types/user';

const HOME_ROUTE_BY_ROLE = {
  customer: '/customer/home',
  provider: '/provider/dashboard',
  admin: '/admin/dashboard',
} as const satisfies Record<UserRole, Href>;

// Landing screen for each role after login / registration.
export function getHomeRouteForRole(role: UserRole): Href {
  return HOME_ROUTE_BY_ROLE[role];
}

type ErrorMessages = Partial<Record<number, string>>;

// Converts any thrown error into a message that is safe to show to users.
// Raw server/technical errors are never shown; validation messages written for
// users (400) are passed through, and callers can override messages per status.
export function getFriendlyErrorMessage(error: unknown, overrides: ErrorMessages = {}): string {
  if (error instanceof ApiError) {
    if (overrides[error.status]) return overrides[error.status]!;
    switch (error.status) {
      case 0:
        return 'Unable to reach the server. Check your internet connection and try again.';
      case 400:
        return error.message;
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You do not have permission to do that.';
      case 404:
        return 'We could not find what you were looking for.';
      case 409:
        return error.message;
      default:
        return 'Something went wrong on our side. Please try again in a moment.';
    }
  }
  return 'Something went wrong. Please try again.';
}

const lkrFormatter = new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 });

// Prices are shown in LKR as in the prototype, e.g. "Rs. 2,500".
export function formatLKR(amount: number): string {
  return `Rs. ${lkrFormatter.format(amount)}`;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
