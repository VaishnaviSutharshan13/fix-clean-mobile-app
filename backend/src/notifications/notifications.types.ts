import type { NotificationType } from './notification-type.js';

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId: string | null;
  bookingReference: string | null;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationListResponse {
  items: NotificationView[];
  // All of the user's unread notifications, not only the returned page.
  unreadCount: number;
}
