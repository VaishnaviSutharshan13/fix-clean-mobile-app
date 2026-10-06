import type { AppNotification, NotificationList } from '../types/notification';
import { apiRequest } from './api';

// Notification Management. The user is identified from the JWT on the server,
// so only the signed-in user's own notifications are returned or changed.
export const notificationService = {
  listMine(bookingId?: string): Promise<NotificationList> {
    return apiRequest<NotificationList>('/notifications/me', { query: { bookingId } });
  },

  markRead(notificationId: string): Promise<AppNotification> {
    return apiRequest<AppNotification>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH',
    });
  },
};
