/**
 * DEVELOPMENT / TEST TOOL — not part of the API or any app screen.
 *
 * The Provider module (which will own confirm / decline / on-the-way /
 * complete) is not built yet. This command lets developers move a booking
 * through those provider transitions so the Customer tracking screen, its
 * status-change notification and the phone-visibility rules can be tested.
 *
 * It uses the same BOOKING_TRANSITIONS rules as the API, so it cannot skip
 * steps (e.g. requested → completed) or reopen finished bookings.
 *
 *   yarn dev:booking-status <reference> <confirmed|on_the_way|completed|declined>
 *   yarn dev:booking-status FC-J7VR95 confirmed
 *
 * Refuses to run when NODE_ENV=production.
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module.js';
import { BookingStatus, canTransition } from '../bookings/booking-status.js';
import { Booking } from '../bookings/schemas/booking.schema.js';

// Only provider-side transitions; customers cancel through the app.
const PROVIDER_STATUSES = [
  BookingStatus.Confirmed,
  BookingStatus.OnTheWay,
  BookingStatus.Completed,
  BookingStatus.Declined,
];

function usage(message?: string): never {
  if (message) console.error(`Error: ${message}\n`);
  console.error('Usage: yarn dev:booking-status <reference> <confirmed|on_the_way|completed|declined>');
  process.exit(1);
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    usage('this development tool refuses to run when NODE_ENV=production');
  }

  const [reference, target] = process.argv.slice(2);
  if (!reference || !target) usage();
  if (!PROVIDER_STATUSES.includes(target as BookingStatus)) {
    usage(`"${target}" is not a provider status (allowed: ${PROVIDER_STATUSES.join(', ')})`);
  }
  const status = target as BookingStatus;

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const bookings = app.get<Model<Booking>>(getModelToken(Booking.name));
    const booking = await bookings.findOne({ reference: reference.toUpperCase() }).exec();
    if (!booking) usage(`no booking with reference ${reference}`);

    if (!canTransition(booking.status, status)) {
      usage(`cannot change ${booking.reference} from "${booking.status}" to "${status}"`);
    }

    const from = booking.status;
    booking.status = status;
    booking.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: booking.provider,
      note: 'Simulated by development tool',
    });
    await booking.save();
    console.log(`${booking.reference}: ${from} → ${status}`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
