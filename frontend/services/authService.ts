import type { AuthResponse, LoginPayload, RegisterPayload, RegisterProviderPayload, User } from '../types/user';
import { apiRequest } from './api';

export const authService = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: payload });
  },

  registerCustomer(payload: RegisterPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/register/customer', { method: 'POST', body: payload });
  },

  registerProvider(payload: RegisterProviderPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/register/provider', { method: 'POST', body: payload });
  },

  getProfile(token: string): Promise<User> {
    return apiRequest<User>('/auth/profile', { token });
  },
};
