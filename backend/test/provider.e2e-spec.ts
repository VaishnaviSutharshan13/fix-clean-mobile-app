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
  VerificationStatus,
} from './../src/providers/schemas/provider-profile.schema.js';

function futureDate(days: number): string {
  const [y, m, d] = sriLankaNow().date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

const providerSignup = {
  name: 'Sunil Fernando',
  email: 'sunil.pro@example.com',
  phone: '0771234567',
  password: 'Provider123',
  category: 'plumbing',
  serviceArea: 'Jaffna',
  experienceYears: 10,
};

describe('Provider module (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let http: ReturnType<typeof request>;
  let profiles: Model<ProviderProfile>;
  let bookings: Model<Booking>;

  let providerToken: string;
  let providerId: string;
  let otherProviderToken: string;
  let customerToken: string;
  let serviceId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const createBooking = async (days = 2, slot = '10:00-12:00') => {
    const res = await http
      .post('/bookings')
      .set(auth(customerToken))
      .send({
        providerId,
        serviceId,
        scheduledDate: futureDate(days),
        timeSlot: slot,
        address: {
          street: '25 Kandy Road',
          city: 'Jaffna',
          landmark: 'Near temple',
        },
        problemDescription: 'Kitchen tap leaking',
      })
      .expect(201);
    return res.body as { id: string; reference: string };
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
    profiles = app.get<Model<ProviderProfile>>(
      getModelToken(ProviderProfile.name),
    );
    bookings = app.get<Model<Booking>>(getModelToken(Booking.name));

    const customer = await http
      .post('/auth/register/customer')
      .send({
        name: 'Nadeesha Perera',
        email: 'nadeesha@example.com',
        phone: '0779876543',
        password: 'Secret123',
      })
      .expect(201);
    customerToken = customer.body.accessToken;

    const other = await http
      .post('/auth/register/provider')
      .send({
        ...providerSignup,
        name: 'Other Pro',
        email: 'other.pro@example.com',
      })
      .expect(201);
    otherProviderToken = other.body.accessToken;
  });

  afterAll(async () => {
    await connection?.dropDatabase();
    await app?.close();
  });

  describe('Provider Sign Up', () => {
    it('creates a provider account and a linked pending profile', async () => {
      const res = await http
        .post('/auth/register/provider')
        .send(providerSignup)
        .expect(201);
      expect(res.body.user).toMatchObject({
        role: 'provider',
        email: 'sunil.pro@example.com',
      });
      expect(JSON.stringify(res.body)).not.toContain('password');
      providerToken = res.body.accessToken;
      providerId = res.body.user.id;

      const profile = await profiles
        .findOne({ user: new Types.ObjectId(providerId) })
        .lean();
      expect(profile).toMatchObject({
        category: 'plumbing',
        serviceArea: 'Jaffna',
        experienceYears: 10,
        headline: 'Plumbing Specialist',
        verificationStatus: 'pending',
      });
    });

    it('validates trade, district and experience', async () => {
      const res = await http
        .post('/auth/register/provider')
        .send({
          ...providerSignup,
          email: 'x@example.com',
          category: 'gardening',
          serviceArea: 'Atlantis',
          experienceYears: -1,
        })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'Please choose your primary trade',
          'Please choose your operating district',
        ]),
      );
    });

    it('rejects duplicates and never accepts a client-supplied role or status', async () => {
      await http
        .post('/auth/register/provider')
        .send(providerSignup)
        .expect(409);
      const res = await http
        .post('/auth/register/provider')
        .send({
          ...providerSignup,
          email: 'y@example.com',
          role: 'admin',
          verificationStatus: 'verified',
        })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'property role should not exist',
          'property verificationStatus should not exist',
        ]),
      );
    });
  });

  describe('account and authorization', () => {
    it('returns the provider account with verification state and default availability', async () => {
      const res = await http
        .get('/provider/me')
        .set(auth(providerToken))
        .expect(200);
      expect(res.body).toMatchObject({
        id: providerId,
        name: 'Sunil Fernando',
        verificationStatus: 'pending',
        availability: { isAvailable: true, workingDays: [0, 1, 2, 3, 4, 5, 6] },
      });
      expect(res.body.availability.timeSlots).toHaveLength(5);
    });

    it('keeps unverified providers hidden from customers', async () => {
      await http
        .get(`/providers/${providerId}`)
        .set(auth(customerToken))
        .expect(404);
    });

    it('requires a token and the provider role', async () => {
      await http.get('/provider/dashboard').expect(401);
      await http.get('/provider/bookings').set(auth(customerToken)).expect(403);
      await http.get('/provider/me').set(auth(customerToken)).expect(403);
    });

    it('lets the provider log in through the shared login', async () => {
      const res = await http
        .post('/auth/login')
        .send({
          email: providerSignup.email,
          password: providerSignup.password,
        })
        .expect(200);
      expect(res.body.user.role).toBe('provider');
    });
  });

  describe('bookings, privacy and transitions', () => {
    let bookingId: string;

    beforeAll(async () => {
      // Admin verification is not built yet: verify the profile and add services directly.
      const profile = await profiles.findOneAndUpdate(
        { user: new Types.ObjectId(providerId) },
        {
          verificationStatus: VerificationStatus.Verified,
          visitFee: 500,
          services: [{ name: 'Tap Repair', price: 2000 }],
        },
        { new: true },
      );
      serviceId = String(profile!.services[0]!._id);
      bookingId = (await createBooking()).id;
    });

    it('lists only the provider’s own requests, hiding the exact address and phone', async () => {
      const res = await http
        .get('/provider/bookings?scope=requests')
        .set(auth(providerToken))
        .expect(200);
      expect(res.body).toHaveLength(1);
      const [request0] = res.body;
      expect(request0).toMatchObject({
        id: bookingId,
        status: 'requested',
        customer: { name: 'Nadeesha Perera' },
        location: { city: 'Jaffna' },
        contactShared: false,
        actions: {
          accept: true,
          decline: true,
          startTrip: false,
          complete: false,
        },
        pricing: { total: 2500 },
      });
      expect(request0.location.street).toBeUndefined();
      expect(request0.customer.phone).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(
        /25 Kandy Road|Near temple|0779876543/,
      );

      const other = await http
        .get('/provider/bookings')
        .set(auth(otherProviderToken))
        .expect(200);
      expect(other.body).toHaveLength(0);
    });

    it('hides another provider’s booking (404) and protects actions on it', async () => {
      await http
        .get(`/provider/bookings/${bookingId}`)
        .set(auth(otherProviderToken))
        .expect(404);
      await http
        .patch(`/provider/bookings/${bookingId}/accept`)
        .set(auth(otherProviderToken))
        .expect(404);
    });

    it('does not let customers call provider actions', async () => {
      await http
        .patch(`/provider/bookings/${bookingId}/accept`)
        .set(auth(customerToken))
        .expect(403);
    });

    it('rejects out-of-order transitions with 409', async () => {
      await http
        .patch(`/provider/bookings/${bookingId}/on-the-way`)
        .set(auth(providerToken))
        .expect(409);
      await http
        .patch(`/provider/bookings/${bookingId}/complete`)
        .set(auth(providerToken))
        .expect(409);
    });

    it('accepts a request: confirmed, history recorded, address and phone unlocked', async () => {
      const res = await http
        .patch(`/provider/bookings/${bookingId}/accept`)
        .set(auth(providerToken))
        .expect(200);
      expect(res.body).toMatchObject({
        status: 'confirmed',
        contactShared: true,
        customer: { phone: '0779876543' },
        location: {
          city: 'Jaffna',
          street: '25 Kandy Road',
          landmark: 'Near temple',
        },
        actions: {
          accept: false,
          decline: false,
          startTrip: true,
          complete: false,
        },
      });

      const stored = await bookings.findById(bookingId).lean();
      const last = stored!.statusHistory[stored!.statusHistory.length - 1]!;
      expect(last.status).toBe('confirmed');
      expect(String(last.changedBy)).toBe(providerId);

      // The customer sees the change (FR3) and the provider's phone (FR6 counterpart).
      const customerView = await http
        .get(`/bookings/me/${bookingId}`)
        .set(auth(customerToken))
        .expect(200);
      expect(customerView.body.status).toBe('confirmed');
      expect(customerView.body.provider.phone).toBe('0771234567');
    });

    it('prevents accepting twice', async () => {
      await http
        .patch(`/provider/bookings/${bookingId}/accept`)
        .set(auth(providerToken))
        .expect(409);
      await http
        .patch(`/provider/bookings/${bookingId}/decline`)
        .set(auth(providerToken))
        .expect(409);
    });

    it('moves confirmed → on the way → completed and the customer sees each step', async () => {
      await http
        .patch(`/provider/bookings/${bookingId}/on-the-way`)
        .set(auth(providerToken))
        .expect(200);
      expect(
        (await http.get(`/bookings/me/${bookingId}`).set(auth(customerToken)))
          .body.status,
      ).toBe('on_the_way');

      const done = await http
        .patch(`/provider/bookings/${bookingId}/complete`)
        .set(auth(providerToken))
        .expect(200);
      expect(done.body.actions).toEqual({
        accept: false,
        decline: false,
        startTrip: false,
        complete: false,
      });

      const customerView = await http
        .get(`/bookings/me/${bookingId}`)
        .set(auth(customerToken));
      expect(customerView.body.status).toBe('completed');
      expect(
        customerView.body.statusHistory.map(
          (h: { status: string }) => h.status,
        ),
      ).toEqual(['requested', 'confirmed', 'on_the_way', 'completed']);
      await http
        .patch(`/provider/bookings/${bookingId}/complete`)
        .set(auth(providerToken))
        .expect(409);
    });

    it('declines a request with a reason that the customer can see', async () => {
      const { id } = await createBooking(3);
      const res = await http
        .patch(`/provider/bookings/${id}/decline`)
        .set(auth(providerToken))
        .send({ reason: 'Fully booked that day' })
        .expect(200);
      expect(res.body).toMatchObject({
        status: 'declined',
        contactShared: false,
      });
      expect(res.body.location.street).toBeUndefined();

      const customerView = await http
        .get(`/bookings/me/${id}`)
        .set(auth(customerToken));
      expect(customerView.body).toMatchObject({
        status: 'declined',
        cancellationReason: 'Fully booked that day',
      });
      await http
        .patch(`/provider/bookings/${id}/accept`)
        .set(auth(providerToken))
        .expect(409);
    });

    it('cannot act on a booking the customer cancelled', async () => {
      const { id } = await createBooking(4);
      await http
        .patch(`/bookings/me/${id}/cancel`)
        .set(auth(customerToken))
        .send({})
        .expect(200);
      await http
        .patch(`/provider/bookings/${id}/accept`)
        .set(auth(providerToken))
        .expect(409);
    });

    it('ignores client attempts to change price, customer or status in action payloads', async () => {
      const { id } = await createBooking(5);
      await http
        .patch(`/provider/bookings/${id}/accept`)
        .set(auth(providerToken))
        .send({ pricing: { total: 1 }, status: 'completed' })
        .expect(400);
      expect((await bookings.findById(id).lean())!.status).toBe('requested');
    });

    it('reports real dashboard counts', async () => {
      const res = await http
        .get('/provider/dashboard')
        .set(auth(providerToken))
        .expect(200);
      expect(res.body).toMatchObject({
        pendingRequests: 1,
        completedJobs: 1,
        activeJobs: 0,
      });
      expect(res.body.recentRequests).toHaveLength(1);
    });
  });

  describe('Manage Availability (FR5)', () => {
    it('persists availability and validates input', async () => {
      const res = await http
        .put('/provider/availability')
        .set(auth(providerToken))
        .send({
          isAvailable: true,
          workingDays: [1, 2, 3, 4, 5, 6],
          timeSlots: ['08:00-10:00', '10:00-12:00'],
        })
        .expect(200);
      expect(res.body.availability).toEqual({
        isAvailable: true,
        workingDays: [1, 2, 3, 4, 5, 6],
        timeSlots: ['08:00-10:00', '10:00-12:00'],
      });

      const reread = await http
        .get('/provider/me')
        .set(auth(providerToken))
        .expect(200);
      expect(reread.body.availability.workingDays).toEqual([1, 2, 3, 4, 5, 6]);

      await http
        .put('/provider/availability')
        .set(auth(providerToken))
        .send({
          isAvailable: true,
          workingDays: [9],
          timeSlots: ['03:00-04:00'],
        })
        .expect(400);
      await http
        .put('/provider/availability')
        .set(auth(providerToken))
        .send({ isAvailable: true, workingDays: [], timeSlots: [] })
        .expect(400);
      await http
        .put('/provider/availability')
        .set(auth(customerToken))
        .send({})
        .expect(403);
    });

    it('stops customers booking outside the provider’s availability', async () => {
      const afternoon = await http
        .post('/bookings')
        .set(auth(customerToken))
        .send({
          providerId,
          serviceId,
          scheduledDate: futureDate(2),
          timeSlot: '14:00-16:00',
          address: { street: '1 Main St', city: 'Jaffna' },
          problemDescription: 'Leak',
        })
        .expect(409);
      expect(afternoon.body.message).toMatch(/time window/);

      await http
        .put('/provider/availability')
        .set(auth(providerToken))
        .send({
          isAvailable: false,
          workingDays: [1],
          timeSlots: ['08:00-10:00'],
        })
        .expect(200);
      const details = await http
        .get(`/providers/${providerId}`)
        .set(auth(customerToken))
        .expect(200);
      expect(details.body.availability.isAvailable).toBe(false);

      const offDuty = await http
        .post('/bookings')
        .set(auth(customerToken))
        .send({
          providerId,
          serviceId,
          scheduledDate: futureDate(2),
          timeSlot: '08:00-10:00',
          address: { street: '1 Main St', city: 'Jaffna' },
          problemDescription: 'Leak',
        })
        .expect(409);
      expect(offDuty.body.message).toMatch(/not accepting new bookings/);
    });
  });

  describe('Services & Rates (provider proposes, admin verifies)', () => {
    let newToken: string;
    let newId: string;
    let otherToken2: string;

    const validServices = {
      visitFee: 400,
      services: [
        {
          name: 'Wiring Fault Repair',
          description: 'Trace and fix short circuits',
          price: 2500,
        },
        { name: 'Fan Installation', price: 1500 },
      ],
    };

    beforeAll(async () => {
      const res = await http
        .post('/auth/register/provider')
        .send({
          ...providerSignup,
          name: 'Ravi Kumar',
          email: 'ravi.new@example.com',
          category: 'electrical',
          serviceArea: 'Kandy',
        })
        .expect(201);
      newToken = res.body.accessToken;
      newId = res.body.user.id;
      const other = await http
        .post('/auth/register/provider')
        .send({
          ...providerSignup,
          name: 'Second Pro',
          email: 'second.pro@example.com',
        })
        .expect(201);
      otherToken2 = other.body.accessToken;
    });

    it('starts a new provider as pending with the chosen category and no services', async () => {
      const me = await http.get('/provider/me').set(auth(newToken)).expect(200);
      expect(me.body).toMatchObject({
        category: 'electrical',
        serviceArea: 'Kandy',
        verificationStatus: 'pending',
        services: [],
        servicesCount: 0,
        visitFee: 0,
      });
    });

    it('validates services, prices and the visiting fee', async () => {
      const bad = async (body: unknown) =>
        (
          await http
            .put('/provider/services')
            .set(auth(newToken))
            .send(body)
            .expect(400)
        ).body.message;

      expect(await bad({ visitFee: 400, services: [] })).toEqual(
        expect.arrayContaining(['Add at least one service']),
      );
      expect(
        await bad({ visitFee: -1, services: validServices.services }),
      ).toEqual(expect.arrayContaining(['Visiting fee cannot be negative']));
      expect(
        await bad({
          visitFee: 0,
          services: [{ name: 'Fan Installation', price: 0 }],
        }),
      ).toEqual(
        expect.arrayContaining([
          'services.0.Service price must be at least Rs. 100',
        ]),
      );
      expect(
        await bad({ visitFee: 0, services: [{ name: 'Ab', price: 1000 }] }),
      ).toEqual(
        expect.arrayContaining([
          'services.0.Service name must be at least 3 characters',
        ]),
      );
      expect(
        await bad({
          visitFee: 0,
          services: [{ name: 'Fan Installation', price: 'free' }],
        }),
      ).toEqual(
        expect.arrayContaining([
          'services.0.Service price must be a whole number of rupees',
        ]),
      );
      expect(
        await bad({ ...validServices, verificationStatus: 'verified' }),
      ).toEqual(
        expect.arrayContaining([
          'property verificationStatus should not exist',
        ]),
      );
      expect(
        await bad({
          visitFee: 0,
          services: [
            { name: 'Fan Installation', price: 1500, category: 'plumbing' },
          ],
        }),
      ).toEqual(
        expect.arrayContaining([
          'services.0.property category should not exist',
        ]),
      );
      expect(
        await bad({
          visitFee: 0,
          services: [
            { name: 'Fan Install', price: 1500 },
            { name: 'fan install', price: 900 },
          ],
        }),
      ).toBe('Each service must have a different name');
      expect(
        await bad({
          visitFee: 0,
          services: Array.from({ length: 11 }, (_, i) => ({
            name: `Service ${i}`,
            price: 1000,
          })),
        }),
      ).toEqual(expect.arrayContaining(['You can list up to 10 services']));
    });

    it('saves services and keeps ids stable when edited', async () => {
      const saved = await http
        .put('/provider/services')
        .set(auth(newToken))
        .send(validServices)
        .expect(200);
      expect(saved.body.visitFee).toBe(400);
      expect(saved.body.services).toHaveLength(2);
      const [wiring] = saved.body.services;

      const edited = await http
        .put('/provider/services')
        .set(auth(newToken))
        .send({
          visitFee: 500,
          services: [
            { id: wiring.id, name: 'Wiring Fault Repair', price: 2800 },
          ],
        })
        .expect(200);
      expect(edited.body.services).toEqual([
        {
          id: wiring.id,
          name: 'Wiring Fault Repair',
          description: '',
          price: 2800,
        },
      ]);
      // Still pending: proposing services never verifies the provider.
      expect(edited.body.verificationStatus).toBe('pending');
    });

    it('only lets a provider edit their own services', async () => {
      const mine = (await http.get('/provider/me').set(auth(newToken))).body
        .services[0].id as string;
      // Another provider referencing this provider's service id is rejected…
      await http
        .put('/provider/services')
        .set(auth(otherToken2))
        .send({
          visitFee: 0,
          services: [{ id: mine, name: 'Hijacked', price: 100 }],
        })
        .expect(400);
      // …and the original is unchanged.
      const after = await http.get('/provider/me').set(auth(newToken));
      expect(after.body.services[0]).toMatchObject({
        id: mine,
        name: 'Wiring Fault Repair',
        price: 2800,
      });

      await http
        .put('/provider/services')
        .set(auth(customerToken))
        .send(validServices)
        .expect(403);
      await http.put('/provider/services').send(validServices).expect(401);
    });

    it('keeps a pending provider hidden from customers even with services', async () => {
      await http
        .get(`/providers/${newId}`)
        .set(auth(customerToken))
        .expect(404);
      const list = await http
        .get('/providers?category=electrical')
        .set(auth(customerToken))
        .expect(200);
      expect(list.body.map((p: { id: string }) => p.id)).not.toContain(newId);
    });

    it('makes the provider visible and bookable once verified (admin step simulated)', async () => {
      await profiles.updateOne(
        { user: new Types.ObjectId(newId) },
        {
          verificationStatus: VerificationStatus.Verified,
          verificationChecks: {
            identity: true,
            contact: true,
            experience: true,
          },
        },
      );
      const details = await http
        .get(`/providers/${newId}`)
        .set(auth(customerToken))
        .expect(200);
      expect(details.body.services).toHaveLength(1);
      expect(details.body.visitFee).toBe(500);

      const booking = await http
        .post('/bookings')
        .set(auth(customerToken))
        .send({
          providerId: newId,
          serviceId: details.body.services[0].id,
          scheduledDate: futureDate(2),
          timeSlot: '10:00-12:00',
          address: { street: '5 Temple Road', city: 'Kandy' },
          problemDescription: 'Breaker trips',
        })
        .expect(201);
      expect(booking.body.pricing).toMatchObject({
        servicePrice: 2800,
        visitFee: 500,
        total: 3300,
      });
    });

    it('hides a verified provider who has no services', async () => {
      const res = await http
        .post('/auth/register/provider')
        .send({
          ...providerSignup,
          name: 'No Services',
          email: 'noservices@example.com',
          category: 'cleaning',
        })
        .expect(201);
      await profiles.updateOne(
        { user: new Types.ObjectId(res.body.user.id) },
        { verificationStatus: VerificationStatus.Verified },
      );
      await http
        .get(`/providers/${res.body.user.id}`)
        .set(auth(customerToken))
        .expect(404);
      const categories = await http
        .get('/providers/categories')
        .set(auth(customerToken))
        .expect(200);
      const cleaning = categories.body.find(
        (c: { category: string }) => c.category === 'cleaning',
      );
      expect(cleaning.providerCount).toBe(0);
    });
  });
});
