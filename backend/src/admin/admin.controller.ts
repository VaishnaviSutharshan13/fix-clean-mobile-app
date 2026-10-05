import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../users/schemas/user.schema.js';
import { AdminBookingsService } from './admin-bookings.service.js';
import { AdminComplaintsService } from './admin-complaints.service.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminVerificationService } from './admin-verification.service.js';
import type {
  AdminBookingDetails,
  AdminComplaintDetails,
  AdminDashboardView,
  AdminProviderDetails,
  AdminUserDetails,
} from './admin.types.js';
import {
  RejectProviderDto,
  UpdateComplaintStatusDto,
  UpdateUserStatusDto,
  UpdateVerificationChecksDto,
} from './dto/admin-actions.dto.js';
import {
  AdminBookingsQueryDto,
  AdminComplaintsQueryDto,
  AdminProvidersQueryDto,
  AdminUsersQueryDto,
} from './dto/admin-queries.dto.js';

// Admin API. Every route requires a valid JWT (401 otherwise) and the admin
// role (403 for customers and providers), enforced on the server.
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class AdminController {
  constructor(
    private readonly dashboardService: AdminDashboardService,
    private readonly verificationService: AdminVerificationService,
    private readonly usersService: AdminUsersService,
    private readonly bookingsService: AdminBookingsService,
    private readonly complaintsService: AdminComplaintsService,
  ) {}

  @Get('dashboard')
  dashboard(): Promise<AdminDashboardView> {
    return this.dashboardService.get();
  }

  // ---- Provider verification (FR7) ----

  @Get('providers')
  providers(@Query() query: AdminProvidersQueryDto) {
    return this.verificationService.list(query);
  }

  @Get('providers/:id')
  provider(@Param('id', ParseObjectIdPipe) id: Types.ObjectId): Promise<AdminProviderDetails> {
    return this.verificationService.details(String(id));
  }

  @Patch('providers/:id/checks')
  updateChecks(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateVerificationChecksDto,
  ): Promise<AdminProviderDetails> {
    return this.verificationService.updateChecks(String(id), dto);
  }

  @Patch('providers/:id/verify')
  verify(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<AdminProviderDetails> {
    return this.verificationService.approve(admin.id, String(id));
  }

  @Patch('providers/:id/reject')
  reject(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: RejectProviderDto,
  ): Promise<AdminProviderDetails> {
    return this.verificationService.reject(admin.id, String(id), dto);
  }

  // ---- User management ----

  @Get('users')
  users(@Query() query: AdminUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Get('users/:id')
  user(@CurrentUser() admin: AuthUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId): Promise<AdminUserDetails> {
    return this.usersService.details(admin.id, String(id));
  }

  @Patch('users/:id/status')
  setUserStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<AdminUserDetails> {
    return this.usersService.setStatus(admin.id, String(id), dto.isActive);
  }

  // ---- Booking monitoring (read-only) ----

  @Get('bookings')
  bookings(@Query() query: AdminBookingsQueryDto) {
    return this.bookingsService.list(query);
  }

  @Get('bookings/:id')
  booking(@Param('id', ParseObjectIdPipe) id: Types.ObjectId): Promise<AdminBookingDetails> {
    return this.bookingsService.details(String(id));
  }

  // ---- Complaints / disputes ----

  @Get('complaints')
  complaints(@Query() query: AdminComplaintsQueryDto) {
    return this.complaintsService.list(query);
  }

  @Get('complaints/:id')
  complaint(@Param('id', ParseObjectIdPipe) id: Types.ObjectId): Promise<AdminComplaintDetails> {
    return this.complaintsService.details(String(id));
  }

  @Patch('complaints/:id/status')
  setComplaintStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateComplaintStatusDto,
  ): Promise<AdminComplaintDetails> {
    return this.complaintsService.updateStatus(admin.id, String(id), dto);
  }
}
