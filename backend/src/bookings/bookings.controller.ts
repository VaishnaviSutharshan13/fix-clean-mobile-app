import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../users/schemas/user.schema.js';
import { BookingsService } from './bookings.service.js';
import type { CustomerBookingView } from './bookings.types.js';
import { CancelBookingDto } from './dto/cancel-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';

// Customer booking endpoints. The customer is always the authenticated user;
// a customer id is never accepted from the client.
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.Customer)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto): Promise<CustomerBookingView> {
    return this.bookingsService.createForCustomer(user.id, dto);
  }

  @Get('me')
  @Roles(Role.Customer)
  listMine(
    @CurrentUser() user: AuthUser,
    @Query('scope') scope?: string,
  ): Promise<CustomerBookingView[]> {
    return this.bookingsService.listForCustomer(user.id, scope === 'active' ? 'active' : 'all');
  }

  @Get('me/:id')
  @Roles(Role.Customer)
  findMine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<CustomerBookingView> {
    return this.bookingsService.findOneForCustomer(user.id, String(id));
  }

  @Patch('me/:id')
  @Roles(Role.Customer)
  updateMine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateBookingDto,
  ): Promise<CustomerBookingView> {
    return this.bookingsService.updateForCustomer(user.id, String(id), dto);
  }

  @Patch('me/:id/cancel')
  @Roles(Role.Customer)
  cancelMine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: CancelBookingDto,
  ): Promise<CustomerBookingView> {
    return this.bookingsService.cancelForCustomer(user.id, String(id), dto);
  }
}
