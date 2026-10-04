import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Alert, Platform } from 'react-native';

import { colors } from '../constants/theme';
import type { BookingStatus } from '../types/booking';
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

// Pure date/time formatters live in ./dates (no React Native imports, unit-testable).
export { addDays, formatBookingDate, formatDateTime, formatRelative, formatTimeSlot, sriLankaToday } from './dates';

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
