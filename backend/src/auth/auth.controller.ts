import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service.js';

// REST endpoints will be added in a later milestone.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
