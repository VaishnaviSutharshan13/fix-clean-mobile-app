import { SetMetadata } from '@nestjs/common';
import { Role } from '../users/schemas/user.schema.js';

export const ROLES_KEY = 'roles';

// Usage: @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
