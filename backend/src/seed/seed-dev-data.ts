/**
 * DEVELOPMENT SEED DATA — not production functionality.
 *
 * Inserts sample verified providers (plus one pending provider for the Admin
 * verification demo), customers, a development admin account, past completed
 * bookings with reviews (FR1), bookings in every other status (Admin Booking
 * Monitoring) and sample complaints (Admin Complaints / Disputes).
 * Seed accounts use "@seed.fixclean.lk" emails and fixed ids, and are updated
 * in place on every run, so bookings that other customers made with a seed
 * provider stay valid. Only the sample bookings ("FC-SEED…"), their reviews and
 * the sample complaints ("CP-SEED…") are deleted and recreated. No other data
 * is touched.
 *
 * Run: yarn seed   (refuses to run when NODE_ENV=production)
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { AppModule } from '../app.module.js';
import { BookingStatus } from '../bookings/booking-status.js';
import { Booking } from '../bookings/schemas/booking.schema.js';
import { ComplaintCategory, ComplaintStatus } from '../complaints/complaint-status.js';
import { Complaint } from '../complaints/schemas/complaint.schema.js';
import {
  ProviderProfile,
  ServiceCategory,
  VerificationStatus,
} from '../providers/schemas/provider-profile.schema.js';
import { Review } from '../reviews/schemas/review.schema.js';
import { Role, User } from '../users/schemas/user.schema.js';

const SEED_DOMAIN = 'seed.fixclean.lk';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'SeedPass123';

type SeedProvider = {
  name: string;
  phone: string;
  category: ServiceCategory;
  headline: string;
  bio: string;
  serviceArea: string;
  experienceYears: number;
  visitFee: number;
  services: { name: string; description: string; price: number }[];
  status: VerificationStatus;
  reviews: { rating: number; comment: string }[];
};

const PROVIDERS: SeedProvider[] = [
  {
    name: 'Sunil Fernando',
    phone: '0771234501',
    category: ServiceCategory.Plumbing,
    headline: 'Licensed Master Plumber',
    bio: 'Fixing leaks, taps and water pumps across Jaffna for over 8 years. Punctual and tidy.',
    serviceArea: 'Jaffna',
    experienceYears: 8,
    visitFee: 500,
    services: [
      { name: 'Plumbing & Tap Repair', description: 'Fix leaking taps, replace faucets and valves.', price: 2000 },
      { name: 'Pipe Leak Diagnostics', description: 'Find hidden leaks and fix pipe joints.', price: 2500 },
      { name: 'Overhead Tank & Pump Check', description: 'Inspect tank, float valve and pump wiring.', price: 3000 },
    ],
    status: VerificationStatus.Verified,
    reviews: [
      { rating: 5, comment: 'Arrived right on time and fixed our kitchen tap in 15 minutes. Very clean work.' },
      { rating: 5, comment: 'Found the hidden leak behind the wall quickly. Fair price.' },
      { rating: 4, comment: 'Good job on the pump, came 20 minutes late but called ahead.' },
    ],
  },
  {
    name: 'Kasun Perera',
    phone: '0712345602',
    category: ServiceCategory.Plumbing,
    headline: 'Pipe Fitting & Drainage Specialist',
    bio: 'Drain unblocking, new pipe lines and bathroom fittings in Colombo and suburbs.',
    serviceArea: 'Colombo',
    experienceYears: 5,
    visitFee: 400,
    services: [
      { name: 'Drain Unblocking', description: 'Clear blocked sinks, floor drains and toilets.', price: 1800 },
      { name: 'Pipe Fitting', description: 'Install or replace PVC and GI pipe lines.', price: 2200 },
    ],
    status: VerificationStatus.Verified,
    reviews: [
      { rating: 5, comment: 'Cleared a badly blocked drain that two others could not fix.' },
      { rating: 4, comment: 'Professional and explained the problem clearly.' },
    ],
  },
  {
    name: 'Dinesh Silva',
    phone: '0759876503',
    category: ServiceCategory.Plumbing,
    headline: 'Leak Repair & Overhaul',
    bio: 'Affordable leak repairs and bathroom overhauls around Kankesanthurai and Jaffna.',
    serviceArea: 'Kankesanthurai',
    experienceYears: 4,
    visitFee: 300,
    services: [
      { name: 'Leak Repair', description: 'Repair leaking pipes, joints and cisterns.', price: 1500 },
      { name: 'Bathroom Fittings Overhaul', description: 'Replace showers, mixers and cistern parts.', price: 3500 },
    ],
    status: VerificationStatus.Verified,
    reviews: [{ rating: 4, comment: 'Quick and affordable. Would book again.' }],
  },
  {
    name: 'Nuwan Jayasinghe',
    phone: '0761122304',
    category: ServiceCategory.Electrical,
    headline: 'Certified Electrician (NVQ Level 4)',
    bio: 'House wiring, breaker and fan/light installations. Safety-first, certified work.',
    serviceArea: 'Colombo',
    experienceYears: 10,
    visitFee: 500,
    services: [
      { name: 'Wiring Fault Repair', description: 'Trace and fix short circuits and tripping breakers.', price: 2500 },
      { name: 'Fan & Light Installation', description: 'Install ceiling fans, lights and switches.', price: 1500 },
      { name: 'Distribution Board Upgrade', description: 'Replace old fuse boxes with MCB/RCCB boards.', price: 6000 },
    ],
    status: VerificationStatus.Verified,
    reviews: [
      { rating: 5, comment: 'Fixed the tripping issue that had bothered us for months.' },
      { rating: 5, comment: 'Very knowledgeable and careful. Highly recommended.' },
    ],
  },
  {
    name: 'Tharindu Wickramasinghe',
    phone: '0703344505',
    category: ServiceCategory.Electrical,
    headline: 'Home Electrical Technician',
    bio: 'Electrical repairs and appliance points for homes in Kandy.',
    serviceArea: 'Kandy',
    experienceYears: 3,
    visitFee: 400,
    services: [
      { name: 'Socket & Switch Repair', description: 'Repair or replace sockets, switches and plugs.', price: 1200 },
      { name: 'Appliance Point Installation', description: 'New 15A points for AC, washer or geyser.', price: 2800 },
    ],
    status: VerificationStatus.Verified,
    reviews: [{ rating: 4, comment: 'Neat installation for our AC point.' }],
  },
  {
    name: 'Malini Gunawardena',
    phone: '0778899006',
    category: ServiceCategory.Cleaning,
    headline: 'Home Deep Cleaning Team Lead',
    bio: 'Two-person team for deep cleaning, move-in/move-out and post-renovation cleaning.',
    serviceArea: 'Colombo',
    experienceYears: 6,
    visitFee: 0,
    services: [
      { name: 'Full Home Deep Clean', description: 'Kitchen, bathrooms, floors and windows.', price: 8500 },
      { name: 'Kitchen Deep Clean', description: 'Degreasing cabinets, hood, tiles and appliances.', price: 3500 },
      { name: 'Sofa & Carpet Shampoo', description: 'Shampoo and vacuum sofas and carpets.', price: 4000 },
    ],
    status: VerificationStatus.Verified,
    reviews: [
      { rating: 5, comment: 'House was spotless after the renovation. Amazing team.' },
      { rating: 4, comment: 'Thorough kitchen cleaning, took a bit longer than expected.' },
    ],
  },
  {
    name: 'Priya Navaratnam',
    phone: '0724455607',
    category: ServiceCategory.Cleaning,
    headline: 'Residential Cleaner',
    bio: 'Regular and one-time home cleaning in Jaffna town.',
    serviceArea: 'Jaffna',
    experienceYears: 2,
    visitFee: 200,
    services: [
      { name: 'Standard Home Cleaning', description: 'Sweeping, mopping, dusting and bathrooms.', price: 3000 },
      { name: 'Bathroom Deep Clean', description: 'Descaling tiles, fittings and glass.', price: 2000 },
    ],
    status: VerificationStatus.Verified,
    reviews: [],
  },
  {
    // Pending verification: must NOT appear to customers until an admin approves.
    name: 'Ruwan Bandara',
    phone: '0715566708',
    category: ServiceCategory.Electrical,
    headline: 'Electrician',
    bio: 'Awaiting verification.',
    serviceArea: 'Galle',
    experienceYears: 1,
    visitFee: 300,
    services: [{ name: 'General Electrical Repair', description: 'Basic electrical repairs.', price: 1500 }],
    status: VerificationStatus.Pending,
    reviews: [],
  },
];

// Development administrator (admins can't self-register).
const ADMIN = { name: 'Platform Administrator', email: `admin@${SEED_DOMAIN}`, phone: '0112345600' };

const CUSTOMERS = [
  { name: 'Kumari Perera', phone: '0771110001' },
  { name: 'Ahamed Rizvi', phone: '0771110002' },
  { name: 'Lakshmi Sivakumar', phone: '0771110003' },
];

// Same ObjectId on every run, so references to seed users/services never break.
function stableId(key: string): Types.ObjectId {
  return new Types.ObjectId(createHash('sha256').update(`fixclean-seed:${key}`).digest('hex').slice(0, 24));
}

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${SEED_DOMAIN}`;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Calendar date in Sri Lanka time (UTC+05:30), `days` from today.
function sriLankaDatePlus(days: number): string {
  return isoDate(new Date(Date.now() + 5.5 * 3_600_000 + days * 86_400_000));
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed development data when NODE_ENV=production');
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const users = app.get<Model<User>>(getModelToken(User.name));
    const profiles = app.get<Model<ProviderProfile>>(getModelToken(ProviderProfile.name));
    const bookings = app.get<Model<Booking>>(getModelToken(Booking.name));
    const reviews = app.get<Model<Review>>(getModelToken(Review.name));
    const complaints = app.get<Model<Complaint>>(getModelToken(Complaint.name));

    const seedEmails = [...[...CUSTOMERS, ...PROVIDERS].map((x) => emailFor(x.name)), ADMIN.email];
    const seedEmailPattern = new RegExp(`@${SEED_DOMAIN.replace(/\./g, '\\.')}$`);

    // 1. Remove the previous sample complaints, bookings and reviews (seed-owned only).
    await complaints.deleteMany({ reference: /^CP-SEED/ });
    const oldSampleBookings = await bookings.find({ reference: /^FC-SEED/ }, '_id');
    await reviews.deleteMany({ booking: { $in: oldSampleBookings.map((b) => b._id) } });
    await bookings.deleteMany({ reference: /^FC-SEED/ });

    // 2. Remove seed accounts that are no longer in the seed list, and older
    //    seed accounts created with random ids (one-time migration).
    const existingSeedUsers = await users.find({ email: seedEmailPattern }, '_id email');
    const staleIds = existingSeedUsers
      .filter((u) => !seedEmails.includes(u.email) || !u._id.equals(stableId(u.email)))
      .map((u) => u._id);
    if (staleIds.length > 0) {
      await profiles.deleteMany({ user: { $in: staleIds } });
      await users.deleteMany({ _id: { $in: staleIds } });
    }

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

    // 3. Upsert seed accounts with fixed ids.
    const upsertUser = async (name: string, phone: string, role: Role, email = emailFor(name)) => {
      const _id = stableId(email);
      await users.updateOne(
        { _id },
        // Also reactivates seed accounts an admin suspended during a demo.
        { $set: { name, email, phone, password: passwordHash, role, isActive: true }, $unset: { suspendedAt: 1 } },
        { upsert: true },
      );
      return _id;
    };

    const adminId = await upsertUser(ADMIN.name, ADMIN.phone, Role.Admin, ADMIN.email);

    const customerIds: Types.ObjectId[] = [];
    for (const c of CUSTOMERS) customerIds.push(await upsertUser(c.name, c.phone, Role.Customer));

    let bookingCounter = 0;
    const nextReference = () => `FC-SEED${String(++bookingCounter).padStart(2, '0')}`;
    // First completed booking of each seed customer (used for sample complaints).
    const completedByCustomer = new Map<number, { _id: Types.ObjectId; provider: Types.ObjectId }>();
    const providerData = new Map<string, { userId: Types.ObjectId; services: { _id: Types.ObjectId; name: string; price: number }[] }>();
    for (const p of PROVIDERS) {
      const email = emailFor(p.name);
      const userId = await upsertUser(p.name, p.phone, Role.Provider);
      const verified = p.status === VerificationStatus.Verified;
      const services = p.services.map((svc) => ({ _id: stableId(`${email}:${svc.name}`), ...svc }));
      await profiles.updateOne(
        { user: userId },
        {
          $set: {
            category: p.category,
            headline: p.headline,
            bio: p.bio,
            serviceArea: p.serviceArea,
            experienceYears: p.experienceYears,
            visitFee: p.visitFee,
            services,
            verificationStatus: p.status,
            verificationChecks: { identity: verified, contact: verified, experience: verified },
            verifiedAt: verified ? daysAgo(120) : null,
            reviewedAt: verified ? daysAgo(120) : null,
            reviewedBy: verified ? adminId : null,
            rejectionReason: null,
          },
          $setOnInsert: { _id: stableId(`profile:${email}`) },
        },
        { upsert: true },
      );

      providerData.set(p.name, { userId, services });

      // Each review belongs to a past completed booking by a seed customer.
      for (const [index, r] of p.reviews.entries()) {
        const customerIndex = index % customerIds.length;
        const customerId = customerIds[customerIndex]!;
        const service = services[index % services.length]!;
        const completedAt = daysAgo(10 + index * 7);
        const booking = await bookings.create({
          reference: nextReference(),
          customer: customerId,
          provider: userId,
          service: { serviceId: service._id, name: service.name, category: p.category },
          scheduledDate: isoDate(completedAt),
          timeSlot: '10:00-12:00',
          address: { street: 'No. 10, Temple Road', city: p.serviceArea, landmark: '' },
          problemDescription: `Sample past job: ${service.name.toLowerCase()}.`,
          pricing: {
            servicePrice: service.price,
            visitFee: p.visitFee,
            total: service.price + p.visitFee,
            currency: 'LKR',
          },
          status: BookingStatus.Completed,
          statusHistory: [
            BookingStatus.Requested,
            BookingStatus.Confirmed,
            BookingStatus.OnTheWay,
            BookingStatus.Completed,
          ].map((status, step) => ({
            status,
            changedAt: new Date(completedAt.getTime() + step * 3_600_000),
          })),
        });
        if (!completedByCustomer.has(customerIndex)) {
          completedByCustomer.set(customerIndex, { _id: booking._id, provider: userId });
        }
        await reviews.create({
          booking: booking._id,
          customer: customerId,
          provider: userId,
          rating: r.rating,
          comment: r.comment,
          createdAt: new Date(completedAt.getTime() + 5 * 3_600_000),
        });
      }
    }

    // 4. Bookings in the other statuses, for Admin Booking Monitoring. They
    //    also appear in the seed providers' portals as real requests/jobs.
    const completedCount = bookingCounter;
    const lifecycle: Record<string, BookingStatus[]> = {
      [BookingStatus.Requested]: [BookingStatus.Requested],
      [BookingStatus.Confirmed]: [BookingStatus.Requested, BookingStatus.Confirmed],
      [BookingStatus.OnTheWay]: [BookingStatus.Requested, BookingStatus.Confirmed, BookingStatus.OnTheWay],
      [BookingStatus.Cancelled]: [BookingStatus.Requested, BookingStatus.Cancelled],
      [BookingStatus.Declined]: [BookingStatus.Requested, BookingStatus.Declined],
    };
    const activeSamples = [
      { status: BookingStatus.Requested, customer: 0, provider: 'Sunil Fernando', days: 2, slot: '10:00-12:00' },
      { status: BookingStatus.Confirmed, customer: 1, provider: 'Nuwan Jayasinghe', days: 1, slot: '14:00-16:00' },
      { status: BookingStatus.OnTheWay, customer: 2, provider: 'Malini Gunawardena', days: 0, slot: '16:00-18:00' },
      { status: BookingStatus.Cancelled, customer: 0, provider: 'Kasun Perera', days: 3, slot: '08:00-10:00', reason: 'Fixed it myself' },
      { status: BookingStatus.Declined, customer: 1, provider: 'Tharindu Wickramasinghe', days: 2, slot: '12:00-14:00', reason: 'Fully booked that day' },
    ];
    for (const [index, sample] of activeSamples.entries()) {
      const provider = PROVIDERS.find((x) => x.name === sample.provider)!;
      const { userId, services } = providerData.get(sample.provider)!;
      const service = services[0]!;
      const customerId = customerIds[sample.customer]!;
      const createdAt = new Date(Date.now() - (activeSamples.length - index) * 3_600_000);
      await bookings.create({
        reference: nextReference(),
        customer: customerId,
        provider: userId,
        service: { serviceId: service._id, name: service.name, category: provider.category },
        scheduledDate: sriLankaDatePlus(sample.days),
        timeSlot: sample.slot,
        address: { street: 'No. 42, Station Road', city: provider.serviceArea, landmark: '' },
        problemDescription: `Sample booking: ${service.name.toLowerCase()}.`,
        pricing: {
          servicePrice: service.price,
          visitFee: provider.visitFee,
          total: service.price + provider.visitFee,
          currency: 'LKR',
        },
        status: sample.status,
        cancellationReason: sample.reason,
        statusHistory: lifecycle[sample.status]!.map((status, step) => ({
          status,
          changedAt: new Date(createdAt.getTime() + step * 600_000),
          changedBy: step === 0 || status === BookingStatus.Cancelled ? customerId : userId,
          ...(step > 0 && sample.reason ? { note: sample.reason } : {}),
        })),
        createdAt,
      });
    }

    // 5. Sample complaints in each lifecycle state (Admin Complaints / Disputes).
    const complaintSamples = [
      {
        customer: 0,
        status: ComplaintStatus.Open,
        category: ComplaintCategory.ServiceQuality,
        subject: 'Tap started leaking again after two days',
        description:
          'The kitchen tap that was repaired started dripping again two days later. I would like the provider to come back and fix it properly without another visiting fee.',
      },
      {
        customer: 1,
        status: ComplaintStatus.InReview,
        category: ComplaintCategory.Pricing,
        subject: 'Charged more than the listed price',
        description: 'The provider asked for an extra Rs. 500 in cash on top of the listed service price and visiting fee.',
      },
      {
        customer: 2,
        status: ComplaintStatus.Resolved,
        category: ComplaintCategory.NoShow,
        subject: 'Provider arrived an hour late',
        description: 'The provider arrived about an hour after the selected arrival window without calling ahead.',
        resolution: 'Provider apologised and agreed to call customers when running late. Customer accepted.',
      },
    ];
    let complaintCounter = 0;
    for (const sample of complaintSamples) {
      const booking = completedByCustomer.get(sample.customer);
      if (!booking) continue;
      const customerId = customerIds[sample.customer]!;
      const openedAt = daysAgo(6 - complaintCounter * 2);
      const steps =
        sample.status === ComplaintStatus.Open
          ? [ComplaintStatus.Open]
          : sample.status === ComplaintStatus.InReview
            ? [ComplaintStatus.Open, ComplaintStatus.InReview]
            : [ComplaintStatus.Open, ComplaintStatus.InReview, ComplaintStatus.Resolved];
      complaintCounter++;
      await complaints.create({
        reference: `CP-SEED${String(complaintCounter).padStart(2, '0')}`,
        customer: customerId,
        provider: booking.provider,
        booking: booking._id,
        category: sample.category,
        subject: sample.subject,
        description: sample.description,
        status: sample.status,
        statusHistory: steps.map((status, step) => ({
          status,
          changedAt: new Date(openedAt.getTime() + step * 86_400_000),
          changedBy: step === 0 ? customerId : adminId,
          ...(status === ComplaintStatus.Resolved && sample.resolution ? { note: sample.resolution } : {}),
        })),
        ...(sample.resolution
          ? { resolutionNote: sample.resolution, resolvedAt: new Date(openedAt.getTime() + 2 * 86_400_000) }
          : {}),
        createdAt: openedAt,
      });
    }

    const verifiedCount = PROVIDERS.filter((p) => p.status === VerificationStatus.Verified).length;
    console.log(
      `Seeded ${PROVIDERS.length} providers (${verifiedCount} verified, ${PROVIDERS.length - verifiedCount} pending), ` +
        `${CUSTOMERS.length} customers, 1 admin (${ADMIN.email}), ${completedCount} completed bookings with reviews, ` +
        `${bookingCounter - completedCount} bookings in other statuses and ${complaintCounter} complaints.`,
    );
    console.log(`Seed accounts use "@${SEED_DOMAIN}" emails and the password from SEED_PASSWORD (default: ${SEED_PASSWORD === 'SeedPass123' ? 'SeedPass123' : '<custom>'}).`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
