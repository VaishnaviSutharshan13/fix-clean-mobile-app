import { TIME_SLOTS } from '../bookings/booking-status.js';
import { ALL_WEEKDAYS } from './schemas/provider-profile.schema.js';

export interface AvailabilityView {
  isAvailable: boolean;
  workingDays: number[];
  timeSlots: string[];
}

// Fills defaults for profiles created before availability existed.
export function normalizeAvailability(
  value: Partial<AvailabilityView> | null | undefined,
): AvailabilityView {
  return {
    isAvailable: value?.isAvailable ?? true,
    workingDays: [...(value?.workingDays ?? ALL_WEEKDAYS)].sort((a, b) => a - b),
    timeSlots: TIME_SLOTS.filter((slot) => (value?.timeSlots ?? TIME_SLOTS).includes(slot)),
  };
}

// Returns a customer-facing reason when the provider can't take that slot.
export function availabilityProblem(
  availability: AvailabilityView,
  scheduledDate: string,
  timeSlot: string,
): string | null {
  if (!availability.isAvailable) return 'This provider is not accepting new bookings right now.';
  const [y, m, d] = scheduledDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  if (!availability.workingDays.includes(weekday)) {
    return "The provider doesn't work on that day. Please choose another date.";
  }
  if (!availability.timeSlots.includes(timeSlot)) {
    return "The provider doesn't work in that time window. Please choose another one.";
  }
  return null;
}
