import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../users/schemas/user.schema.js';
import { ComplaintsService, type CustomerComplaintView } from './complaints.service.js';
import { CreateComplaintDto } from './dto/create-complaint.dto.js';

// Customer complaint submission. Complaints are managed by administrators
// through /admin/complaints.
@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Customer)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateComplaintDto): Promise<CustomerComplaintView> {
    return this.complaintsService.createForCustomer(user.id, dto);
  }
}
