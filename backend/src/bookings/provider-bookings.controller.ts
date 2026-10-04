import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../users/schemas/user.schema.js';
import { ProviderBookingActionDto } from './dto/provider-booking-action.dto.js';
import { ProviderBookingsService, type ProviderBookingScope } from './provider-bookings.service.js';
import type { ProviderBookingView, ProviderDashboardView } from './provider-bookings.types.js';

const SCOPES: ProviderBookingScope[] = ['requests', 'active', 'history', 'all'];

// Provider-side booking endpoints (FR4). The provider is always the
// authenticated user; bookings of other providers are never returned.
@Controller('provider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Provider)
export class ProviderBookingsController {
  constructor(private readonly providerBookings: ProviderBookingsService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser): Promise<ProviderDashboardView> {
    return this.providerBookings.dashboard(user.id);
  }

  @Get('bookings')
  list(@CurrentUser() user: AuthUser, @Query('scope') scope?: string): Promise<ProviderBookingView[]> {
    const valid = SCOPES.includes(scope as ProviderBookingScope) ? (scope as ProviderBookingScope) : 'all';
    return this.providerBookings.list(user.id, valid);
  }

  @Get('bookings/:id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<ProviderBookingView> {
    return this.providerBookings.findOne(user.id, String(id));
  }

  @Patch('bookings/:id/accept')
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    // Validated (unknown fields → 400) even though the action takes no input.
    @Body() _dto: ProviderBookingActionDto,
  ) {
    return this.providerBookings.perform(user.id, String(id), 'accept');
  }

  @Patch('bookings/:id/decline')
  @HttpCode(HttpStatus.OK)
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: ProviderBookingActionDto,
  ) {
    return this.providerBookings.perform(user.id, String(id), 'decline', dto.reason);
  }

  @Patch('bookings/:id/on-the-way')
  @HttpCode(HttpStatus.OK)
  onTheWay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    // Validated (unknown fields → 400) even though the action takes no input.
    @Body() _dto: ProviderBookingActionDto,
  ) {
    return this.providerBookings.perform(user.id, String(id), 'on-the-way');
  }

  @Patch('bookings/:id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    // Validated (unknown fields → 400) even though the action takes no input.
    @Body() _dto: ProviderBookingActionDto,
  ) {
    return this.providerBookings.perform(user.id, String(id), 'complete');
  }
}
