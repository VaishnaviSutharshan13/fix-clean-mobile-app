import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { sriLankaNow } from './../src/bookings/booking-dates.js';
import { Booking } from './../src/bookings/schemas/booking.schema.js';
import {
  ProviderProfile,
  ServiceCategory,
  VerificationStatus,
} from './../src/providers/schemas/provider-profile.schema.js';
import { Review } from './../src/reviews/schemas/review.schema.js';

function futureDate(days: number): string {
  const [y, m, d] = sriLankaNow().date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

describe('Customer flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let http: ReturnType<typeof request>;

  let customerToken: string;
  let otherCustomerToken: string;
  let providerToken: string;
  let verifiedProviderId: string;
  let pendingProviderId: string;
  let serviceId: string;
  let bookingId: string;

  const register = async (path: 'customer' | 'provider', email: string) => {
    const res = await http
      .post(`/auth/register/${path}`)
      .send({
        name: `Test ${path}`,
        email,
        phone: '0771234567',
        password: 'Secret123',
        ...(path === 'provider'
          ? { category: 'plumbing', serviceArea: 'Jaffna', experienceYears: 8 }
          : {}),
      })
      .expect(201);
    return res.body as { accessToken: string; user: { id: string } };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    http = request(app.getHttpServer());

    connection = app.get<Connection>(getConnectionToken());
    if (!connection.name.endsWith('-test')) {
      throw new Error(`Refusing to run e2e tests against "${connection.name}"`);
    }
    await connection.dropDatabase();
    await connection.syncIndexes();

    const customer = await register('customer', 'cust@example.com');
    const other = await register('customer', 'other@example.com');
    const verified = await register('provider', 'verified.pro@example.com');
    const pending = await register('provider', 'pending.pro@example.com');
    customerToken = customer.accessToken;
    otherCustomerToken = other.accessToken;
    providerToken = verified.accessToken;
    verifiedProviderId = verified.user.id;
    pendingProviderId = pending.user.id;

    const profiles = app.get<Model<ProviderProfile>>(
      getModelToken(ProviderProfile.name),
    );
    // Provider sign-up creates a pending profile; complete it as an admin would.
    const profile = (await profiles.findOneAndUpdate(
      { user: new Types.ObjectId(verifiedProviderId) },
      {
        category: ServiceCategory.Plumbing,
        headline: 'Licensed Master Plumber',
        serviceArea: 'Jaffna',
        experienceYears: 8,
        visitFee: 500,
        services: [
          { name: 'Tap Repair', price: 2000 },
          { name: 'Leak Diagnostics', price: 2500 },
        ],
        verificationStatus: VerificationStatus.Verified,
        verificationChecks: { identity: true, contact: true, experience: true },
      },
      { returnDocument: 'after' },
    ))!;
    serviceId = String(profile.services[0]!._id);
    await profiles.updateOne(
      { user: new Types.ObjectId(pendingProviderId) },
      {
        category: ServiceCategory.Plumbing,
        headline: 'Unverified Plumber',
        serviceArea: 'Galle',
        experienceYears: 1,
        services: [{ name: 'Tap Repair', price: 100 }],
        verificationStatus: VerificationStatus.Pending,
      },
    );

    // A past completed booking + review so ratings are computed from real data.
    const bookings = app.get<Model<Booking>>(getModelToken(Booking.name));
    const past = await bookings.create({
      reference: 'FC-PAST01',
      customer: new Types.ObjectId(customer.user.id),
      provider: new Types.ObjectId(verifiedProviderId),
      service: {
        serviceId: profile.services[0]!._id,
        name: 'Tap Repair',
        category: 'plumbing',
      },
      scheduledDate: '2026-01-10',
      timeSlot: '10:00-12:00',
      address: { street: '1 Main St', city: 'Jaffna' },
      problemDescription: 'Old job',
      pricing: {
        servicePrice: 2000,
        visitFee: 500,
        total: 2500,
        currency: 'LKR',
      },
      status: 'completed',
    });
    await app.get<Model<Review>>(getModelToken(Review.name)).create({
      booking: past._id,
      customer: new Types.ObjectId(customer.user.id),
      provider: new Types.ObjectId(verifiedProviderId),
      rating: 4,
      comment: 'Good work',
    });
  });

  afterAll(async () => {
    await connection?.dropDatabase();
    await app?.close();
  });

  const asCustomer = (req: request.Test) =>
    req.set('Authorization', `Bearer ${customerToken}`);

  describe('provider discovery', () => {
    it('lists only verified providers with computed rating, reviews and jobs', async () => {
      const res = await asCustomer(http.get('/providers')).expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: verifiedProviderId,
        name: 'Test provider',
        verificationStatus: 'verified',
        ratingAverage: 4,
        reviewCount: 1,
        completedJobs: 1,
        startingPrice: 2000,
      });
    });

    it('filters by category and search', async () => {
      expect(
        (
          await asCustomer(http.get('/providers?category=electrical')).expect(
            200,
          )
        ).body,
      ).toHaveLength(0);
      expect(
        (await asCustomer(http.get('/providers?search=jaff')).expect(200)).body,
      ).toHaveLength(1);
      expect(
        (await asCustomer(http.get('/providers?search=galle')).expect(200))
          .body,
      ).toHaveLength(0);
    });

    it('rejects an invalid category with 400', async () => {
      await asCustomer(http.get('/providers?category=gardening')).expect(400);
    });

    it('returns category summaries with starting prices', async () => {
      const res = await asCustomer(http.get('/providers/categories')).expect(
        200,
      );
      expect(res.body).toEqual([
        { category: 'plumbing', providerCount: 1, startingPrice: 2000 },
        { category: 'electrical', providerCount: 0, startingPrice: null },
        { category: 'cleaning', providerCount: 0, startingPrice: null },
      ]);
    });

    it('returns provider details with services and reviews', async () => {
      const res = await asCustomer(
        http.get(`/providers/${verifiedProviderId}`),
      ).expect(200);
      expect(res.body.services).toHaveLength(2);
      expect(res.body.priceRange).toEqual({ min: 2000, max: 2500 });
      expect(res.body.recentReviews[0]).toMatchObject({
        rating: 4,
        customerName: 'T. customer',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/password|email|phone/);
    });

    it('hides unverified providers (404) and rejects malformed ids (400)', async () => {
      await asCustomer(http.get(`/providers/${pendingProviderId}`)).expect(404);
      await asCustomer(http.get('/providers/not-an-id')).expect(400);
    });

    it('lists reviews for a provider', async () => {
      const res = await asCustomer(
        http.get(`/reviews?providerId=${verifiedProviderId}`),
      ).expect(200);
      expect(res.body.total).toBe(1);
    });
  });

  describe('access control', () => {
    it('requires a token (401)', async () => {
      await http.get('/providers').expect(401);
      await http.get('/bookings/me').expect(401);
      await http.post('/bookings').send({}).expect(401);
    });

    it('rejects non-customer roles (403)', async () => {
      await http
        .get('/providers')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(403);
      await http
        .get('/bookings/me')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(403);
    });
  });

  describe('bookings', () => {
    const validBooking = () => ({
      providerId: verifiedProviderId,
      serviceId,
      scheduledDate: futureDate(2),
      timeSlot: '10:00-12:00',
      address: {
        street: '25 Kandy Road',
        city: 'Jaffna',
        landmark: 'Near temple',
      },
      problemDescription: 'Kitchen tap leaking',
    });

    it('creates a booking for the authenticated customer with server-side pricing', async () => {
      const res = await asCustomer(http.post('/bookings'))
        .send(validBooking())
        .expect(201);
      bookingId = res.body.id;
      expect(res.body).toMatchObject({
        status: 'requested',
        service: { name: 'Tap Repair', category: 'plumbing' },
        pricing: {
          servicePrice: 2000,
          visitFee: 500,
          total: 2500,
          currency: 'LKR',
        },
        provider: {
          id: verifiedProviderId,
          headline: 'Licensed Master Plumber',
        },
        canModify: true,
        canCancel: true,
      });
      expect(res.body.reference).toMatch(/^FC-[A-Z0-9]{6}$/);
      expect(res.body.provider.phone).toBeUndefined();

      const stored = await app
        .get<Model<Booking>>(getModelToken(Booking.name))
        .findById(bookingId)
        .lean();
      expect(stored?.statusHistory.map((h) => h.status)).toEqual(['requested']);
    });

    it('does not accept customerId, prices or status from the client', async () => {
      const res = await asCustomer(http.post('/bookings'))
        .send({
          ...validBooking(),
          customerId: new Types.ObjectId().toString(),
          pricing: { total: 1 },
          status: 'completed',
        })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'property customerId should not exist',
          'property pricing should not exist',
          'property status should not exist',
        ]),
      );
    });

    it('validates provider, service, date and slot', async () => {
      await asCustomer(http.post('/bookings'))
        .send({ ...validBooking(), providerId: pendingProviderId })
        .expect(404);
      await asCustomer(http.post('/bookings'))
        .send({ ...validBooking(), serviceId: new Types.ObjectId().toString() })
        .expect(400);
      const past = await asCustomer(http.post('/bookings'))
        .send({ ...validBooking(), scheduledDate: '2020-01-01' })
        .expect(400);
      expect(past.body.message).toMatch(/past/);
      await asCustomer(http.post('/bookings'))
        .send({ ...validBooking(), timeSlot: '23:00-01:00' })
        .expect(400);
      await asCustomer(http.post('/bookings'))
        .send({ ...validBooking(), address: { street: '' } })
        .expect(400);
    });

    it("lists and shows only the customer's own bookings", async () => {
      const mine = await asCustomer(http.get('/bookings/me')).expect(200);
      expect(mine.body.map((b: { id: string }) => b.id)).toContain(bookingId);

      const active = await asCustomer(
        http.get('/bookings/me?scope=active'),
      ).expect(200);
      expect(
        active.body.every((b: { status: string }) => b.status === 'requested'),
      ).toBe(true);

      const others = await http
        .get('/bookings/me')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(200);
      expect(others.body).toHaveLength(0);
      await http
        .get(`/bookings/me/${bookingId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(404);
      await asCustomer(http.get(`/bookings/me/${bookingId}`)).expect(200);
    });

    it('lets the customer modify a requested booking and recalculates the price', async () => {
      const otherService = (
        await asCustomer(http.get(`/providers/${verifiedProviderId}`)).expect(
          200,
        )
      ).body.services[1].id as string;
      const res = await asCustomer(http.patch(`/bookings/me/${bookingId}`))
        .send({ serviceId: otherService, timeSlot: '14:00-16:00' })
        .expect(200);
      expect(res.body).toMatchObject({
        timeSlot: '14:00-16:00',
        service: { name: 'Leak Diagnostics' },
        pricing: { total: 3000 },
      });
      await http
        .patch(`/bookings/me/${bookingId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({ timeSlot: '08:00-10:00' })
        .expect(404);
    });

    it('reveals provider phone and blocks modification once confirmed', async () => {
      await app
        .get<Model<Booking>>(getModelToken(Booking.name))
        .updateOne(
          { _id: bookingId },
          {
            status: 'confirmed',
            $push: {
              statusHistory: { status: 'confirmed', changedAt: new Date() },
            },
          },
        );

      const res = await asCustomer(
        http.get(`/bookings/me/${bookingId}`),
      ).expect(200);
      expect(res.body.provider.phone).toBe('0771234567');
      expect(res.body).toMatchObject({ canModify: false, canCancel: true });

      await asCustomer(http.patch(`/bookings/me/${bookingId}`))
        .send({ timeSlot: '08:00-10:00' })
        .expect(409);
    });

    it('cancels a booking and records the reason in the status history', async () => {
      const res = await asCustomer(
        http.patch(`/bookings/me/${bookingId}/cancel`),
      )
        .send({ reason: 'Fixed it myself' })
        .expect(200);
      expect(res.body).toMatchObject({
        status: 'cancelled',
        canCancel: false,
        cancellationReason: 'Fixed it myself',
      });
      expect(
        res.body.statusHistory.map((h: { status: string }) => h.status),
      ).toEqual(['requested', 'confirmed', 'cancelled']);
      expect(res.body.provider.phone).toBeUndefined();

      await asCustomer(http.patch(`/bookings/me/${bookingId}/cancel`))
        .send({})
        .expect(409);
    });

    // Provider-owned transitions (simulated here until the Provider module exists).
    const setStatus = async (id: string, statuses: string[]) => {
      await app.get<Model<Booking>>(getModelToken(Booking.name)).updateOne(
        { _id: id },
        {
          status: statuses[statuses.length - 1],
          $push: {
            statusHistory: {
              $each: statuses.map((s) => ({
                status: s,
                changedAt: new Date(),
              })),
            },
          },
        },
      );
    };

    it('shows a completed booking as finished: phone visible, no modify/cancel', async () => {
      const created = await asCustomer(http.post('/bookings'))
        .send(validBooking())
        .expect(201);
      await setStatus(created.body.id, [
        'confirmed',
        'on_the_way',
        'completed',
      ]);

      const res = await asCustomer(
        http.get(`/bookings/me/${created.body.id}`),
      ).expect(200);
      expect(res.body).toMatchObject({
        status: 'completed',
        canModify: false,
        canCancel: false,
      });
      expect(res.body.provider.phone).toBe('0771234567');
      expect(
        res.body.statusHistory.map((h: { status: string }) => h.status),
      ).toEqual(['requested', 'confirmed', 'on_the_way', 'completed']);
      await asCustomer(http.patch(`/bookings/me/${created.body.id}/cancel`))
        .send({})
        .expect(409);
    });

    it('shows a declined booking without provider contact details', async () => {
      const created = await asCustomer(http.post('/bookings'))
        .send(validBooking())
        .expect(201);
      await setStatus(created.body.id, ['declined']);

      const res = await asCustomer(
        http.get(`/bookings/me/${created.body.id}`),
      ).expect(200);
      expect(res.body).toMatchObject({
        status: 'declined',
        canModify: false,
        canCancel: false,
      });
      expect(res.body.provider.phone).toBeUndefined();
      await asCustomer(http.patch(`/bookings/me/${created.body.id}`))
        .send({ timeSlot: '08:00-10:00' })
        .expect(409);
    });

    it('gives customers no way to set provider statuses', async () => {
      const created = await asCustomer(http.post('/bookings'))
        .send(validBooking())
        .expect(201);
      await asCustomer(http.patch(`/bookings/me/${created.body.id}`))
        .send({ status: 'completed' })
        .expect(400);
      await asCustomer(http.patch(`/bookings/me/${created.body.id}/confirm`))
        .send({})
        .expect(404);
      await asCustomer(http.patch(`/bookings/me/${created.body.id}/complete`))
        .send({})
        .expect(404);
      const res = await asCustomer(
        http.get(`/bookings/me/${created.body.id}`),
      ).expect(200);
      expect(res.body.status).toBe('requested');
    });
  });
});
