import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProvidersModule } from '../providers/providers.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { ProviderBookingsController } from './provider-bookings.controller.js';
import { ProviderBookingsService } from './provider-bookings.service.js';
import { Booking, BookingSchema } from './schemas/booking.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    ProvidersModule,
  ],
  controllers: [BookingsController, ProviderBookingsController],
  providers: [BookingsService, ProviderBookingsService],
  exports: [BookingsService, MongooseModule],
})
export class BookingsModule {}
