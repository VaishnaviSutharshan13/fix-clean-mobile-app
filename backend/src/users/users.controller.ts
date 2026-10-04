import { Controller } from '@nestjs/common';
import { UsersService } from './users.service.js';

// REST endpoints will be added in a later milestone.
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
