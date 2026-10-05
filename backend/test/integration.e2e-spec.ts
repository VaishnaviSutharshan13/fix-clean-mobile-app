import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { sriLankaNow } from './../src/bookings/booking-dates.js';
import { Booking } from './../src/bookings/schemas/booking.schema.js';
import { Role, User } from './../src/users/schemas/user.schema.js';

// Final three-role integration pass (Provider → Admin → Customer → Provider),
// driven only through the real HTTP API of each role. The developer CLI
// (dev:booking-status) is deliberately not used here.

function futureDate(days: number): string {
  const [y, m, d] = sriLankaNow().date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

const PASSWORD = 'Secret123';
const ADMIN = { email: 'final.admin@example.com', password: 'AdminPass123' };
const STREET = '42 Temple Road, Nallur';
const CUSTOMER_PHONE = '0779876543';
const ALL_SLOTS = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

const providerSignup = (name: string, email: string) => ({
  name,
  email,
  phone: '0771234567',
  password: PASSWORD,
  category: 'cleaning',
  serviceArea: 'Jaffna',
  experienceYears: 4,
});

describe('Three-role integration (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let http: ReturnType<typeof request>;
  let users: Model<User>;
  let bookings: Model<Booking>;

  let adminToken: string;
  let customerToken: string;
  let otherCustomerToken: string;
  let providerToken: string;
  let providerId: string;
  let otherProviderToken: string;
  let serviceId: string;
  let lifecycleBookingId: string;
  let declinedBookingId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const register = async (kind: 'customer' | 'provider', body: object) => {
    const res = await http.post(`/auth/register/${kind}`).send(body).expect(201);
    return res.body as { accessToken: string; user: { id: string } };
  };

  const bookingBody = (overrides: object = {}) => ({
    providerId,
    serviceId,
    scheduledDate: futureDate(2),
    timeSlot: '10:00-12:00',
    address: { street: STREET, city: 'Jaffna', landmark: 'Near the kovil' },
    problemDescription: 'Deep clean of a two-bedroom house',
    ...overrides,
  });

  const customerSeesProvider = async (search?: string): Promise<boolean> => {
    const res = await http
      .get('/providers')
      .query(search ? { search } : {})
      .set(auth(customerToken))
      .expect(200);
    return (res.body as { id: string }[]).some((p) => p.id === providerId);
  };

  const setAvailability = (body: object) =>
    http.put('/provider/availability').set(auth(providerToken)).send(body).expect(200);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
    users = app.get<Model<User>>(getModelToken(User.name));
    bookings = app.get<Model<Booking>>(getModelToken(Booking.name));

    // Admins can't self-register, so the account is created directly.
    await users.create({
      name: 'Final Admin',
      email: ADMIN.email,
      phone: '0112345678',
      password: await bcrypt.hash(ADMIN.password, 12),
      role: Role.Admin,
    });
    adminToken = (await http.post('/auth/login').send(ADMIN).expect(200)).body.accessToken;

    customerToken = (
      await register('customer', {
        name: 'Tharshini Rajan',
        email: 'tharshini@example.com',
        phone: CUSTOMER_PHONE,
        password: PASSWORD,
      })
    ).accessToken;
    otherCustomerToken = (
      await register('customer', {
        name: 'Other Customer',
        email: 'other.customer@example.com',
        phone: '0779876500',
        password: PASSWORD,
      })
    ).accessToken;
  });

  afterAll(async () => {
    await connection?.dropDatabase();
    await app?.close();
  });

  describe('Provider → Admin → Customer → Provider lifecycle', () => {
    it('1. provider signs up as pending and proposes services & rates', async () => {
      const provider = await register('provider', providerSignup('Meera Sivakumar', 'meera.final@example.com'));
      providerToken = provider.accessToken;
      providerId = provider.user.id;

      const me = await http.get('/provider/me').set(auth(providerToken)).expect(200);
      expect(me.body.verificationStatus).toBe('pending');

      const saved = await http
        .put('/provider/services')
        .set(auth(providerToken))
        .send({ visitFee: 400, services: [{ name: 'Deep House Cleaning', price: 6500 }] })
        .expect(200);
      serviceId = saved.body.services[0].id;
      expect(saved.body.verificationStatus).toBe('pending');
    });

    it('2. customer cannot find, view or book the pending provider', async () => {
      expect(await customerSeesProvider()).toBe(false);
      expect(await customerSeesProvider('Meera')).toBe(false);
      await http.get(`/providers/${providerId}`).set(auth(customerToken)).expect(404);
      await http.post('/bookings').set(auth(customerToken)).send(bookingBody()).expect(404);
    });

    it('3. admin sees the request, completes the checks and approves', async () => {
      const queue = await http.get('/admin/providers?status=pending').set(auth(adminToken)).expect(200);
      expect((queue.body.items as { id: string }[]).map((p) => p.id)).toContain(providerId);

      const details = await http.get(`/admin/providers/${providerId}`).set(auth(adminToken)).expect(200);
      expect(details.body.services[0]).toMatchObject({ name: 'Deep House Cleaning', price: 6500 });
      expect(details.body.visitFee).toBe(400);
      expect(details.body.approval.ready).toBe(false);

      // Incomplete checks block approval.
      await http.patch(`/admin/providers/${providerId}/checks`).set(auth(adminToken)).send({ identity: true }).expect(200);
      await http.patch(`/admin/providers/${providerId}/verify`).set(auth(adminToken)).expect(400);

      await http
        .patch(`/admin/providers/${providerId}/checks`)
        .set(auth(adminToken))
        .send({ contact: true, experience: true })
        .expect(200);
      const approved = await http.patch(`/admin/providers/${providerId}/verify`).set(auth(adminToken)).expect(200);
      expect(approved.body.verificationStatus).toBe('verified');
      expect(approved.body.reviewedBy).toBe('Final Admin');

      // Approving twice is rejected.
      await http.patch(`/admin/providers/${providerId}/verify`).set(auth(adminToken)).expect(409);
      await http.patch(`/admin/providers/${providerId}/reject`).set(auth(adminToken)).send({}).expect(409);
    });

    it('4. provider becomes verified in their own portal', async () => {
      const me = await http.get('/provider/me').set(auth(providerToken)).expect(200);
      expect(me.body.verificationStatus).toBe('verified');
    });

    it('5. customer now finds the provider with the real services and prices', async () => {
      expect(await customerSeesProvider()).toBe(true);
      expect(await customerSeesProvider('Deep House')).toBe(true);
      const details = await http.get(`/providers/${providerId}`).set(auth(customerToken)).expect(200);
      expect(details.body.services).toEqual([
        expect.objectContaining({ id: serviceId, name: 'Deep House Cleaning', price: 6500 }),
      ]);
      expect(details.body.visitFee).toBe(400);
      expect(details.body.verificationStatus).toBe('verified');
    });

    it('6. customer books; provider receives the request without exact address or phone', async () => {
      const created = await http.post('/bookings').set(auth(customerToken)).send(bookingBody()).expect(201);
      lifecycleBookingId = created.body.id;
      expect(created.body.status).toBe('requested');
      expect(created.body.reference).toMatch(/^FC-[A-Z0-9]{6}$/);
      expect(created.body.pricing).toEqual({ servicePrice: 6500, visitFee: 400, total: 6900, currency: 'LKR' });
      expect(created.body.provider.phone).toBeUndefined();

      const requests = await http.get('/provider/bookings?scope=requests').set(auth(providerToken)).expect(200);
      const request = (requests.body as { id: string }[]).find((b) => b.id === lifecycleBookingId) as any;
      expect(request).toBeDefined();
      expect(request.location).toEqual({ city: 'Jaffna' });
      expect(request.customer.phone).toBeUndefined();
      expect(request.contactShared).toBe(false);
      expect(JSON.stringify(request)).not.toContain(STREET);
      expect(JSON.stringify(request)).not.toContain(CUSTOMER_PHONE);

      const one = await http.get(`/provider/bookings/${lifecycleBookingId}`).set(auth(providerToken)).expect(200);
      expect(JSON.stringify(one.body)).not.toContain(STREET);
      expect(JSON.stringify(one.body)).not.toContain(CUSTOMER_PHONE);
    });

    it('7. provider accepts; customer sees Confirmed; address and phones are shared', async () => {
      const accepted = await http
        .patch(`/provider/bookings/${lifecycleBookingId}/accept`)
        .set(auth(providerToken))
        .send({})
        .expect(200);
      expect(accepted.body.status).toBe('confirmed');
      expect(accepted.body.location.street).toBe(STREET);
      expect(accepted.body.customer.phone).toBe(CUSTOMER_PHONE);

      const mine = await http.get(`/bookings/me/${lifecycleBookingId}`).set(auth(customerToken)).expect(200);
      expect(mine.body.status).toBe('confirmed');
      expect(mine.body.provider.phone).toBe('0771234567');
      expect(mine.body.canModify).toBe(false);
    });

    it('8. invalid / duplicate transitions are refused', async () => {
      const base = `/provider/bookings/${lifecycleBookingId}`;
      await http.patch(`${base}/accept`).set(auth(providerToken)).send({}).expect(409);
      await http.patch(`${base}/decline`).set(auth(providerToken)).send({}).expect(409);
      // complete before on_the_way
      await http.patch(`${base}/complete`).set(auth(providerToken)).send({}).expect(409);
    });

    it('9. provider marks On the Way; customer sees it', async () => {
      await http
        .patch(`/provider/bookings/${lifecycleBookingId}/on-the-way`)
        .set(auth(providerToken))
        .send({})
        .expect(200);
      const mine = await http.get(`/bookings/me/${lifecycleBookingId}`).set(auth(customerToken)).expect(200);
      expect(mine.body.status).toBe('on_the_way');
      expect(mine.body.canCancel).toBe(false);
      await http.patch(`/bookings/me/${lifecycleBookingId}/cancel`).set(auth(customerToken)).send({}).expect(409);
    });

    it('10. provider completes; customer sees Completed; further changes refused', async () => {
      await http
        .patch(`/provider/bookings/${lifecycleBookingId}/complete`)
        .set(auth(providerToken))
        .send({})
        .expect(200);
      const mine = await http.get(`/bookings/me/${lifecycleBookingId}`).set(auth(customerToken)).expect(200);
      expect(mine.body.status).toBe('completed');
      expect(mine.body.statusHistory.map((h: { status: string }) => h.status)).toEqual([
        'requested',
        'confirmed',
        'on_the_way',
        'completed',
      ]);
      await http
        .patch(`/provider/bookings/${lifecycleBookingId}/complete`)
        .set(auth(providerToken))
        .send({})
        .expect(409);
    });

    it('11. MongoDB status history records every transition with its actor', async () => {
      const stored = await bookings.findById(lifecycleBookingId).lean().exec();
      const customerId = String(stored!.customer);
      expect(stored!.status).toBe('completed');
      expect(stored!.statusHistory.map((h) => [h.status, String(h.changedBy)])).toEqual([
        ['requested', customerId],
        ['confirmed', providerId],
        ['on_the_way', providerId],
        ['completed', providerId],
      ]);
      const times = stored!.statusHistory.map((h) => new Date(h.changedAt).getTime());
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    });

    it('12. admin monitors the booking and its history without address or phone', async () => {
      const list = await http
        .get('/admin/bookings')
        .query({ search: 'Meera', status: 'completed' })
        .set(auth(adminToken))
        .expect(200);
      const item = (list.body.items as { id: string }[]).find((b) => b.id === lifecycleBookingId);
      expect(item).toMatchObject({ city: 'Jaffna', status: 'completed', total: 6900 });

      const details = await http.get(`/admin/bookings/${lifecycleBookingId}`).set(auth(adminToken)).expect(200);
      expect(details.body.statusHistory.map((h: any) => [h.status, h.by?.role])).toEqual([
        ['requested', 'customer'],
        ['confirmed', 'provider'],
        ['on_the_way', 'provider'],
        ['completed', 'provider'],
      ]);
      const json = JSON.stringify(details.body) + JSON.stringify(list.body);
      expect(json).not.toContain(STREET);
      expect(json).not.toContain(CUSTOMER_PHONE);
      expect(json).not.toContain('0771234567');

      // Read-only: there is no admin booking mutation route.
      await http.patch(`/admin/bookings/${lifecycleBookingId}`).set(auth(adminToken)).send({ status: 'cancelled' }).expect(404);
      await http
        .patch(`/admin/bookings/${lifecycleBookingId}/status`)
        .set(auth(adminToken))
        .send({ status: 'cancelled' })
        .expect(404);
    });

    it('13. a separate booking is declined; customer sees Declined with the reason', async () => {
      const created = await http
        .post('/bookings')
        .set(auth(customerToken))
        .send(bookingBody({ timeSlot: '14:00-16:00' }))
        .expect(201);
      declinedBookingId = created.body.id;

      await http
        .patch(`/provider/bookings/${declinedBookingId}/decline`)
        .set(auth(providerToken))
        .send({ reason: 'Fully booked that afternoon' })
        .expect(200);
      // Duplicate decline / accept after decline.
      await http.patch(`/provider/bookings/${declinedBookingId}/decline`).set(auth(providerToken)).send({}).expect(409);
      await http.patch(`/provider/bookings/${declinedBookingId}/accept`).set(auth(providerToken)).send({}).expect(409);

      const mine = await http.get(`/bookings/me/${declinedBookingId}`).set(auth(customerToken)).expect(200);
      expect(mine.body.status).toBe('declined');
      expect(mine.body.cancellationReason).toBe('Fully booked that afternoon');
      expect(mine.body.provider.phone).toBeUndefined();

      const provider = await http.get(`/provider/bookings/${declinedBookingId}`).set(auth(providerToken)).expect(200);
      expect(JSON.stringify(provider.body)).not.toContain(STREET);

      const stored = await bookings.findById(declinedBookingId).lean().exec();
      expect(stored!.statusHistory.map((h) => h.status)).toEqual(['requested', 'declined']);
      expect(String(stored!.statusHistory[1]!.changedBy)).toBe(providerId);
    });
  });

  describe('availability is enforced on the server (FR5)', () => {
    const date = futureDate(3);
    const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== weekday(date));

    afterAll(async () => {
      await setAvailability({ isAvailable: true, workingDays: [0, 1, 2, 3, 4, 5, 6], timeSlots: ALL_SLOTS });
    });

    it('on duty, valid day and window → booking succeeds', async () => {
      await setAvailability({ isAvailable: true, workingDays: [weekday(date)], timeSlots: ['08:00-10:00'] });
      await http
        .post('/bookings')
        .set(auth(customerToken))
        .send(bookingBody({ scheduledDate: date, timeSlot: '08:00-10:00' }))
        .expect(201);
    });

    it('outside the provider’s time windows → 409', async () => {
      const res = await http
        .post('/bookings')
        .set(auth(customerToken))
        .send(bookingBody({ scheduledDate: date, timeSlot: '16:00-18:00' }))
        .expect(409);
      expect(res.body.message).toContain('time window');
    });

    it('wrong working day → 409', async () => {
      await setAvailability({ isAvailable: true, workingDays: otherDays, timeSlots: ALL_SLOTS });
      const res = await http
        .post('/bookings')
        .set(auth(customerToken))
        .send(bookingBody({ scheduledDate: date }))
        .expect(409);
      expect(res.body.message).toContain("doesn't work on that day");
    });

    it('off duty → 409, and the customer sees the provider as unavailable', async () => {
      await setAvailability({ isAvailable: false, workingDays: [], timeSlots: [] });
      const res = await http
        .post('/bookings')
        .set(auth(customerToken))
        .send(bookingBody({ scheduledDate: date }))
        .expect(409);
      expect(res.body.message).toContain('not accepting new bookings');
      const details = await http.get(`/providers/${providerId}`).set(auth(customerToken)).expect(200);
      expect(details.body.isAvailable).toBe(false);
    });

    it('rescheduling a requested booking into an unavailable window → 409', async () => {
      await setAvailability({ isAvailable: true, workingDays: [0, 1, 2, 3, 4, 5, 6], timeSlots: ['08:00-10:00'] });
      const created = await http
        .post('/bookings')
        .set(auth(customerToken))
        .send(bookingBody({ scheduledDate: date, timeSlot: '08:00-10:00' }))
        .expect(201);
      await http
        .patch(`/bookings/me/${created.body.id}`)
        .set(auth(customerToken))
        .send({ timeSlot: '12:00-14:00' })
        .expect(409);
    });
  });

  describe('authentication and authorization across roles', () => {
    it('pending provider can sign in; provider cannot use customer or admin APIs', async () => {
      const pending = await register('provider', providerSignup('Pending Pro', 'pending.final@example.com'));
      otherProviderToken = pending.accessToken;
      const login = await http
        .post('/auth/login')
        .send({ email: 'pending.final@example.com', password: PASSWORD })
        .expect(200);
      expect(login.body.user.role).toBe('provider');
      expect(JSON.stringify(login.body)).not.toMatch(/password|\$2[aby]\$/);

      await http.get('/admin/dashboard').set(auth(otherProviderToken)).expect(403);
      await http.get('/bookings/me').set(auth(otherProviderToken)).expect(403);
      await http.get('/providers').set(auth(otherProviderToken)).expect(403);
      await http.post('/complaints').set(auth(otherProviderToken)).send({}).expect(403);
    });

    it("provider cannot read or act on another provider's bookings", async () => {
      await http.get(`/provider/bookings/${lifecycleBookingId}`).set(auth(otherProviderToken)).expect(404);
      await http.patch(`/provider/bookings/${declinedBookingId}/accept`).set(auth(otherProviderToken)).send({}).expect(404);
      const list = await http.get('/provider/bookings?scope=all').set(auth(otherProviderToken)).expect(200);
      expect(list.body).toEqual([]);
    });

    it('customer cannot use provider or admin APIs', async () => {
      await http.get('/provider/bookings').set(auth(customerToken)).expect(403);
      await http.get('/provider/me').set(auth(customerToken)).expect(403);
      await http.patch(`/provider/bookings/${lifecycleBookingId}/accept`).set(auth(customerToken)).send({}).expect(403);
      await http.get('/admin/bookings').set(auth(customerToken)).expect(403);
    });

    it("customer cannot read another customer's booking (404)", async () => {
      await http.get(`/bookings/me/${lifecycleBookingId}`).set(auth(otherCustomerToken)).expect(404);
      await http.patch(`/bookings/me/${lifecycleBookingId}/cancel`).set(auth(otherCustomerToken)).send({}).expect(404);
    });

    it('role, verificationStatus and verificationChecks cannot be mass-assigned', async () => {
      const signup = await http
        .post('/auth/register/provider')
        .send({
          ...providerSignup('Mass Assign', 'mass.assign@example.com'),
          verificationStatus: 'verified',
          verificationChecks: { identity: true, contact: true, experience: true },
        })
        .expect(400);
      expect(signup.body.message).toEqual(
        expect.arrayContaining([
          'property verificationStatus should not exist',
          'property verificationChecks should not exist',
        ]),
      );

      for (const extra of [{ verificationStatus: 'verified' }, { verificationChecks: { identity: true } }, { role: 'admin' }]) {
        await http
          .put('/provider/services')
          .set(auth(otherProviderToken))
          .send({ visitFee: 0, services: [{ name: 'Sneaky', price: 500 }], ...extra })
          .expect(400);
        await http
          .put('/provider/availability')
          .set(auth(otherProviderToken))
          .send({ isAvailable: true, workingDays: [1], timeSlots: ['08:00-10:00'], ...extra })
          .expect(400);
      }
      const me = await http.get('/provider/me').set(auth(otherProviderToken)).expect(200);
      expect(me.body.verificationStatus).toBe('pending');
      expect(me.body.verificationChecks).toEqual({ identity: false, contact: false, experience: false });
    });

    it('suspended provider: login 403, token 401, hidden from customers; reactivation restores', async () => {
      const pendingRescheduleId = (
        await http.post('/bookings').set(auth(customerToken)).send(bookingBody({ timeSlot: '12:00-14:00' })).expect(201)
      ).body.id;
      await http.patch(`/admin/users/${providerId}/status`).set(auth(adminToken)).send({ isActive: false }).expect(200);
      await http.post('/auth/login').send({ email: 'meera.final@example.com', password: PASSWORD }).expect(403);
      await http.get('/provider/me').set(auth(providerToken)).expect(401);
      expect(await customerSeesProvider()).toBe(false);
      await http.get(`/providers/${providerId}`).set(auth(customerToken)).expect(404);
      await http.post('/bookings').set(auth(customerToken)).send(bookingBody()).expect(404);

      // A requested booking can't be rescheduled to a provider who is no longer bookable.
      await http
        .patch(`/bookings/me/${pendingRescheduleId}`)
        .set(auth(customerToken))
        .send({ scheduledDate: futureDate(5), timeSlot: '16:00-18:00' })
        .expect(404);

      await http.patch(`/admin/users/${providerId}/status`).set(auth(adminToken)).send({ isActive: true }).expect(200);
      expect(await customerSeesProvider()).toBe(true);
      await http.get('/provider/me').set(auth(providerToken)).expect(200);
    });

    it('rejecting an already rejected provider → 409', async () => {
      const pendingId = (await http.get('/provider/me').set(auth(otherProviderToken)).expect(200)).body.id;
      await http.patch(`/admin/providers/${pendingId}/reject`).set(auth(adminToken)).send({ reason: 'Incomplete' }).expect(200);
      await http.patch(`/admin/providers/${pendingId}/reject`).set(auth(adminToken)).send({}).expect(409);
      await http.patch(`/admin/providers/${pendingId}/verify`).set(auth(adminToken)).expect(409);
      const me = await http.get('/provider/me').set(auth(otherProviderToken)).expect(200);
      expect(me.body.verificationStatus).toBe('rejected');
      expect(me.body.rejectionReason).toBe('Incomplete');
    });
  });

  describe('complaints lifecycle', () => {
    let complaintId: string;

    it('only the customer’s own booking can be referenced', async () => {
      await http
        .post('/complaints')
        .set(auth(otherCustomerToken))
        .send({ bookingId: lifecycleBookingId, category: 'pricing', subject: 'Not mine', description: 'This is not my booking' })
        .expect(404);
      await http
        .post('/complaints')
        .set(auth(customerToken))
        .send({ bookingId: new Types.ObjectId().toString(), category: 'pricing', subject: 'Missing', description: 'Booking does not exist' })
        .expect(404);
    });

    it('validates long text and unknown fields', async () => {
      const base = { bookingId: lifecycleBookingId, category: 'service_quality', subject: 'Missed a room' };
      await http
        .post('/complaints')
        .set(auth(customerToken))
        .send({ ...base, description: 'x'.repeat(1001) })
        .expect(400);
      await http
        .post('/complaints')
        .set(auth(customerToken))
        .send({ ...base, description: 'Long but valid. '.repeat(10), status: 'resolved' })
        .expect(400);
      const created = await http
        .post('/complaints')
        .set(auth(customerToken))
        .send({ ...base, description: 'y'.repeat(1000) })
        .expect(201);
      complaintId = created.body.id;
      expect(created.body.status).toBe('open');
    });

    it('open → resolved directly requires a note; resolved is final and persisted', async () => {
      const path = `/admin/complaints/${complaintId}/status`;
      await http.patch(path).set(auth(adminToken)).send({ status: 'resolved' }).expect(400);
      await http.patch(path).set(auth(adminToken)).send({ status: 'resolved', note: 'ok' }).expect(400);
      const resolved = await http
        .patch(path)
        .set(auth(adminToken))
        .send({ status: 'resolved', note: 'Provider returned and finished the room.' })
        .expect(200);
      expect(resolved.body.statusHistory.map((h: { status: string }) => h.status)).toEqual(['open', 'resolved']);
      expect(resolved.body.allowedTransitions).toEqual([]);

      await http.patch(path).set(auth(adminToken)).send({ status: 'in_review' }).expect(409);
      await http.patch(path).set(auth(adminToken)).send({ status: 'open' }).expect(409);
      const reread = await http.get(`/admin/complaints/${complaintId}`).set(auth(adminToken)).expect(200);
      expect(reread.body.status).toBe('resolved');
      expect(reread.body.resolutionNote).toBe('Provider returned and finished the room.');
    });
  });

  describe('edge cases', () => {
    it('validates long names, prices, visit fees and duplicate service names', async () => {
      const longName = 'A'.repeat(100);
      const ok = await register('customer', {
        name: longName,
        email: 'long.name@example.com',
        phone: '0770000001',
        password: PASSWORD,
      });
      expect(ok.user).toMatchObject({ name: longName });
      await http
        .post('/auth/register/customer')
        .send({ name: 'A'.repeat(101), email: 'too.long@example.com', phone: '0770000002', password: PASSWORD })
        .expect(400);

      const put = (body: object) => http.put('/provider/services').set(auth(providerToken)).send(body);
      const svc = (price: unknown) => ({ visitFee: 400, services: [{ id: serviceId, name: 'Deep House Cleaning', price }] });
      await put(svc(1_000_000)).expect(200);
      await put(svc(1_000_001)).expect(400);
      await put(svc(99)).expect(400);
      await put(svc(150.5)).expect(400);
      await put(svc('abc')).expect(400);
      await put({ ...svc(6500), visitFee: -1 }).expect(400);
      await put({ ...svc(6500), visitFee: 10_001 }).expect(400);
      await put({
        visitFee: 400,
        services: [
          { name: 'Window Cleaning', price: 1000 },
          { name: 'window cleaning', price: 1200 },
        ],
      }).expect(400);
      await put(svc(6500)).expect(200);
    });

    it('handles empty search, no results, malformed ids and nonexistent records', async () => {
      const empty = await http.get('/providers').query({ search: '' }).set(auth(customerToken)).expect(200);
      expect(Array.isArray(empty.body)).toBe(true);
      const none = await http.get('/providers').query({ search: 'zzz-no-such-provider' }).set(auth(customerToken)).expect(200);
      expect(none.body).toEqual([]);

      const missing = new Types.ObjectId().toString();
      await http.get('/providers/not-an-id').set(auth(customerToken)).expect(400);
      await http.get(`/providers/${missing}`).set(auth(customerToken)).expect(404);
      await http.get(`/bookings/me/${missing}`).set(auth(customerToken)).expect(404);
      await http.get(`/provider/bookings/${missing}`).set(auth(providerToken)).expect(404);
      await http.patch(`/provider/bookings/${missing}/accept`).set(auth(providerToken)).send({}).expect(404);
      await http.get(`/admin/bookings/${missing}`).set(auth(adminToken)).expect(404);
      await http.get(`/admin/complaints/${missing}`).set(auth(adminToken)).expect(404);
      await http.get('/admin/users/xyz').set(auth(adminToken)).expect(400);

      const noComplaints = await http.get('/admin/complaints?status=in_review').set(auth(adminToken)).expect(200);
      expect(noComplaints.body.items).toEqual([]);
    });

    it('rejects malformed payloads', async () => {
      await http.post('/bookings').set(auth(customerToken)).send('not json').expect(400);
      await http.post('/bookings').set(auth(customerToken)).send({ ...bookingBody(), timeSlot: '07:00-08:00' }).expect(400);
      await http.post('/bookings').set(auth(customerToken)).send({ ...bookingBody(), scheduledDate: '2026-02-30' }).expect(400);
      await http.post('/bookings').set(auth(customerToken)).send({ ...bookingBody(), status: 'confirmed' }).expect(400);
    });
  });
});
