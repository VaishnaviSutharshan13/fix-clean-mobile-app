import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Alert, Platform } from 'react-native';

import { colors } from '../constants/theme';
import type { BookingStatus, TimeSlot } from '../types/booking';
import type { ServiceCategory } from '../types/provider';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORY_META: Record<
  ServiceCategory,
  { label: string; trade: string; icon: IconName; tint: string; bg: string }
> = {
  plumbing: { label: 'Plumbing', trade: 'Plumbers', icon: 'water-outline', tint: '#0F5E9C', bg: '#E7F0F9' },
  electrical: { label: 'Electrical', trade: 'Electricians', icon: 'flash-outline', tint: '#B26A00', bg: '#FFF1D6' },
  cleaning: { label: 'Cleaning', trade: 'Cleaners', icon: 'sparkles-outline', tint: '#12805C', bg: '#DDF4EA' },
};

export const CATEGORIES: ServiceCategory[] = ['plumbing', 'electrical', 'cleaning'];

// Badge text and colours for each booking status (FR3).
export const STATUS_META: Record<BookingStatus, { label: string; fg: string; bg: string; icon: IconName }> = {
  requested: { label: 'Requested', fg: colors.warning, bg: colors.warningSoft, icon: 'time-outline' },
  confirmed: { label: 'Confirmed', fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle-outline' },
  on_the_way: { label: 'On the Way', fg: colors.primary, bg: colors.primarySoft, icon: 'car-outline' },
  completed: { label: 'Completed', fg: colors.success, bg: colors.successSoft, icon: 'checkmark-done-outline' },
  declined: { label: 'Declined', fg: colors.danger, bg: colors.dangerSoft, icon: 'close-circle-outline' },
  cancelled: { label: 'Cancelled', fg: colors.danger, bg: colors.dangerSoft, icon: 'ban-outline' },
};

const SRI_LANKA_TZ = 'Asia/Colombo';

// "2026-10-06" → "Tue, 6 Oct 2026" (dates are calendar dates, no timezone shift).
export function formatBookingDate(isoDate: string, withYear = true): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

// "10:00-12:00" → "10:00 AM – 12:00 PM"
export function formatTimeSlot(slot: TimeSlot | string): string {
  return slot
    .split('-')
    .map((part) => {
      const [h, m] = part.split(':').map(Number);
      const suffix = h! >= 12 ? 'PM' : 'AM';
      const hour12 = h! % 12 === 0 ? 12 : h! % 12;
      return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
    })
    .join(' – ');
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: SRI_LANKA_TZ,
  });
}

export function formatRelative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

// Today's date and hour in Sri Lanka time (matches the server's booking rules).
export function sriLankaToday(): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SRI_LANKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
}

// Cross-platform yes/no confirmation (Alert buttons are not supported on web).
export function confirmAction(title: string, message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Keep', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
