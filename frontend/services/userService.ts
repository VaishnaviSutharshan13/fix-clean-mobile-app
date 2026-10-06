import { config } from '../constants/config';
import { avatarUri } from '../utils/avatarUri';
import { apiRequest } from './api';

// Profile photo of the signed-in user (the server takes the user from the JWT).
export const userService = {
  setAvatar(dataUrl: string): Promise<{ avatarUrl: string | null }> {
    return apiRequest('/users/me/avatar', { method: 'PUT', body: { image: dataUrl } });
  },

  removeAvatar(): Promise<{ avatarUrl: null }> {
    return apiRequest('/users/me/avatar', { method: 'DELETE' });
  },
};

// Full image URL for an API photo path (undefined → show initials).
export function photoUri(path?: string | null): string | undefined {
  return avatarUri(config.apiBaseUrl, path);
}
