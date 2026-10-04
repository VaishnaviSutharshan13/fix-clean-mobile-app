// Single booking lifecycle shared by the Customer, Provider and Admin modules
// (FR3: requested → confirmed → on the way → completed).
export enum BookingStatus {
  Requested = 'requested',
  Confirmed = 'confirmed',
  OnTheWay = 'on_the_way',
  Completed = 'completed',
  Declined = 'declined',
  Cancelled = 'cancelled',
}

// Allowed transitions. Who may perform each one is enforced by the service
// methods (customers may only cancel; providers confirm/decline/progress).
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.Requested]: [BookingStatus.Confirmed, BookingStatus.Declined, BookingStatus.Cancelled],
  [BookingStatus.Confirmed]: [BookingStatus.OnTheWay, BookingStatus.Cancelled],
  [BookingStatus.OnTheWay]: [BookingStatus.Completed],
  [BookingStatus.Completed]: [],
  [BookingStatus.Declined]: [],
  [BookingStatus.Cancelled]: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

// Statuses in which the customer is still waiting for / receiving the service.
export const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.Requested,
  BookingStatus.Confirmed,
  BookingStatus.OnTheWay,
];

// Arrival windows offered on the Book Service screen (Sri Lanka time).
export const TIME_SLOTS = [
  '08:00-10:00',
  '10:00-12:00',
  '12:00-14:00',
  '14:00-16:00',
  '16:00-18:00',
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

export enum PaymentMethod {
  CashOnService = 'cash_on_service',
}
