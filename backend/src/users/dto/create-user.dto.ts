import { Role } from '../schemas/user.schema.js';

// Internal DTO used by AuthService; the role is always decided server-side.
export interface CreateUserDto {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
}
