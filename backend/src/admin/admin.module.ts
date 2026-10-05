import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module.js';
import { ComplaintsModule } from '../complaints/complaints.module.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminBookingsService } from './admin-bookings.service.js';
import { AdminComplaintsService } from './admin-complaints.service.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminVerificationService } from './admin-verification.service.js';
import { AdminController } from './admin.controller.js';

// Administrator module (FR7, FR8). Reuses the existing User, ProviderProfile,
// Booking and Complaint models exported by their own modules.
@Module({
  imports: [UsersModule, ProvidersModule, BookingsModule, ComplaintsModule],
  controllers: [AdminController],
  providers: [
    AdminDashboardService,
    AdminVerificationService,
    AdminUsersService,
    AdminBookingsService,
    AdminComplaintsService,
  ],
})
export class AdminModule {}
