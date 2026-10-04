import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './auth.types.js';

// Injects the authenticated user (set by JwtStrategy) into a route handler.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
