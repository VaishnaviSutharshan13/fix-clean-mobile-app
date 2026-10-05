import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsModule } from '../bookings/bookings.module.js';
import { ComplaintsController } from './complaints.controller.js';
import { ComplaintsService } from './complaints.service.js';
import { Complaint, ComplaintSchema } from './schemas/complaint.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Complaint.name, schema: ComplaintSchema }]),
    BookingsModule,
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  // MongooseModule is exported so the Admin module can manage complaints.
  exports: [ComplaintsService, MongooseModule],
})
export class ComplaintsModule {}
