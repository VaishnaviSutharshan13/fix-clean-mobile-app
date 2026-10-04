import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard for JWT-protected routes. Not applied anywhere yet — it becomes
// functional once JwtStrategy is implemented and registered.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
