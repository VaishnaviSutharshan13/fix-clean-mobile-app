import { Role, UserDocument } from '../users/schemas/user.schema.js';

// Claims stored in the access token.
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

// Public user shape returned to clients — never includes the password hash.
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}
