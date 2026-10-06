// Must match backend/src/notifications/notification-type.ts
export type NotificationType =
  | 'booking_requested'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_on_the_way'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'provider_verified'
  | 'provider_rejected';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId: string | null;
  bookingReference: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}
