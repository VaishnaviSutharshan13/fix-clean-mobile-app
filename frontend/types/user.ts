export type UserRole = 'customer' | 'provider' | 'admin';

// Public user shape returned by the backend (never includes the password).
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  // Public path of the profile photo (e.g. /users/<id>/avatar?v=…), or null.
  avatarUrl: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

// Provider Sign Up adds trade, operating district and experience.
export interface RegisterProviderPayload extends RegisterPayload {
  category: 'plumbing' | 'electrical' | 'cleaning';
  serviceArea: string;
  experienceYears: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
