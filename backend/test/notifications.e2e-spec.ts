import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { sriLankaNow } from './../src/bookings/booking-dates.js';
import { Booking } from './../src/bookings/schemas/booking.schema.js';
import { Notification } from './../src/notifications/schemas/notification.schema.js';
import { Role, User } from './../src/users/schemas/user.schema.js';

// Notification Management: READ (GET /notifications/me) and UPDATE
// (PATCH /notifications/:id/read|unread), plus the real events that create
// notifications (booking requests / status changes and provider verification).

function futureDate(days: number): string {
  const [y, m, d] = sriLankaNow().date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

const PASSWORD = 'Secret123';
const ADMIN = { email: 'notify.admin@example.com', password: 'AdminPass123' };

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  bookingId: string | null;
  bookingReference: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

describe('Notification Management (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let http: ReturnType<typeof request>;
  let users: Model<User>;
  let bookings: Model<Booking>;
  let notifications: Model<Notification>;

  let adminToken: string;
  let customerToken: string;
  let customerId: string;
  let otherCustomerToken: string;
  let providerToken: string;
  let providerId: string;
  let serviceId: string;
  let bookingId: string;
  let bookingReference: string;
  let confirmedNotificationId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const register = async (kind: 'customer' | 'provider', body: object) => {
    const res = await http.post(`/auth/register/${kind}`).send(body).expect(201);
    return res.body as { accessToken: string; user: { id: string } };
  };

  const registerProvider = (name: string, email: string) =>
    register('provider', {
      name,
      email,
      phone: '0771234567',
      password: PASSWORD,
      category: 'plumbing',
      serviceArea: 'Jaffna',
      experienceYears: 6,
    });

  const createBooking = async (days = 2, slot = '10:00-12:00') => {
    const res = await http
      .post('/bookings')
      .set(auth(customerToken))
      .send({
        providerId,
        serviceId,
        scheduledDate: futureDate(days),
        timeSlot: slot,
        address: { street: '25 Kandy Road', city: 'Jaffna', landmark: '' },
        problemDescription: 'Kitchen tap leaking',
      })
      .expect(201);
    return res.body as { id: string; reference: string };
  };

  const listMine = async (token: string, query: object = {}) => {
    const res = await http.get('/notifications/me').query(query).set(auth(token)).expect(200);
    return res.body as { items: NotificationItem[]; unreadCount: number };
  };

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
    notifications = app.get<Model<Notification>>(getModelToken(Notification.name));

    await users.create({
      name: 'Notify Admin',
      email: ADMIN.email,
      phone: '0112345678',
      password: await bcrypt.hash(ADMIN.password, 12),
      role: Role.Admin,
    });
    adminToken = (await http.post('/auth/login').send(ADMIN).expect(200)).body.accessToken;

    const customer = await register('customer', {
      name: 'Nadeesha Perera',
      email: 'nadeesha.notify@example.com',
      phone: '0779876543',
      password: PASSWORD,
    });
    customerToken = customer.accessToken;
    customerId = customer.user.id;
    otherCustomerToken = (
      await register('customer', {
        name: 'Other Customer',
        email: 'other.notify@example.com',
        phone: '0779876500',
        password: PASSWORD,
      })
    ).accessToken;

    const provider = await registerProvider('Sunil Fernando', 'sunil.notify@example.com');
    providerToken = provider.accessToken;
    providerId = provider.user.id;
    const saved = await http
      .put('/provider/services')
      .set(auth(providerToken))
      .send({ visitFee: 500, services: [{ name: 'Tap Repair', price: 2000 }] })
      .expect(200);
    serviceId = saved.body.services[0].id;
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await connection?.dropDatabase();
    await app?.close();
  });

  describe('notifications are created by real events', () => {
    it('admin approval notifies the provider', async () => {
      await http
        .patch(`/admin/providers/${providerId}/checks`)
        .set(auth(adminToken))
        .send({ identity: true, contact: true, experience: true })
        .expect(200);
      await http.patch(`/admin/providers/${providerId}/verify`).set(auth(adminToken)).expect(200);

      const { items, unreadCount } = await listMine(providerToken);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ type: 'provider_verified', title: 'Profile verified', read: false, bookingId: null });
      expect(unreadCount).toBe(1);
    });

    it('admin rejection notifies that provider with the reason', async () => {
      const other = await registerProvider('Rejected Pro', 'rejected.notify@example.com');
      await http
        .patch(`/admin/providers/${other.user.id}/reject`)
        .set(auth(adminToken))
        .send({ reason: 'Could not confirm identity' })
        .expect(200);

      const { items } = await listMine(other.accessToken);
      expect(items).toEqual([
        expect.objectContaining({
          type: 'provider_rejected',
          message: 'Your provider application was not approved. Reason: Could not confirm identity',
        }),
      ]);
    });

    it('a new booking request notifies the provider, not the customer', async () => {
      const booking = await createBooking();
      bookingId = booking.id;
      bookingReference = booking.reference;

      const { items } = await listMine(providerToken);
      expect(items[0]).toMatchObject({
        type: 'booking_requested',
        title: 'New booking request',
        bookingId,
        bookingReference,
        read: false,
      });
      expect(items[0]!.message).toContain('Nadeesha Perera requested Tap Repair');
      expect((await listMine(customerToken)).items).toHaveLength(0);
    });

    it('provider accepting the booking notifies the customer', async () => {
      await http.patch(`/provider/bookings/${bookingId}/accept`).set(auth(providerToken)).send({}).expect(200);

      const { items, unreadCount } = await listMine(customerToken);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ type: 'booking_confirmed', title: 'Booking confirmed', bookingId, read: false });
      expect(items[0]!.message).toContain('Sunil Fernando accepted your booking');
      expect(unreadCount).toBe(1);
      confirmedNotificationId = items[0]!.id;

      const stored = await notifications.findById(confirmedNotificationId).lean().exec();
      expect(String(stored!.recipient)).toBe(customerId);
    });

    it('a customer cancellation notifies the provider', async () => {
      const booking = await createBooking(3);
      await http.patch(`/bookings/me/${booking.id}/cancel`).set(auth(customerToken)).send({}).expect(200);

      const { items } = await listMine(providerToken, { bookingId: booking.id });
      expect(items.map((n) => n.type)).toEqual(['booking_cancelled', 'booking_requested']);
    });

    it('a provider decline notifies the customer', async () => {
      const booking = await createBooking(4);
      await http
        .patch(`/provider/bookings/${booking.id}/decline`)
        .set(auth(providerToken))
        .send({ reason: 'Fully booked' })
        .expect(200);

      const { items } = await listMine(customerToken, { bookingId: booking.id });
      expect(items).toEqual([expect.objectContaining({ type: 'booking_declined', title: 'Booking declined' })]);
    });

    it('a failed notification never breaks the booking action itself', async () => {
      const booking = await createBooking(5);
      const spy = vi.spyOn(notifications, 'create').mockRejectedValueOnce(new Error('notification store down'));

      const res = await http.patch(`/provider/bookings/${booking.id}/accept`).set(auth(providerToken)).send({});
      spy.mockRestore();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('confirmed');
      expect((await bookings.findById(booking.id).lean().exec())!.status).toBe('confirmed');
      expect((await listMine(customerToken, { bookingId: booking.id })).items).toHaveLength(0);
    });
  });

  describe('READ — GET /notifications/me', () => {
    it('requires authentication', async () => {
      await http.get('/notifications/me').expect(401);
      await http.get('/notifications/me').set(auth('not-a-real-token')).expect(401);
    });

    it('returns only the caller’s notifications, newest first, with read state', async () => {
      await http.patch(`/provider/bookings/${bookingId}/on-the-way`).set(auth(providerToken)).send({}).expect(200);

      const mine = await listMine(customerToken, { bookingId });
      expect(mine.items.map((n) => n.type)).toEqual(['booking_on_the_way', 'booking_confirmed']);
      expect(mine.items.every((n) => n.read === false && n.readAt === null)).toBe(true);

      const all = await listMine(customerToken);
      const stored = await notifications.find({ recipient: new Types.ObjectId(customerId) }).lean().exec();
      expect(all.items).toHaveLength(stored.length);
      expect(all.unreadCount).toBe(stored.filter((n) => !n.read).length);
      const times = all.items.map((n) => new Date(n.createdAt).getTime());
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    });

    it('never exposes another user’s notifications or the recipient id', async () => {
      const other = await listMine(otherCustomerToken);
      expect(other).toEqual({ items: [], unreadCount: 0 });

      // Asking for someone else's booking returns nothing rather than their data.
      expect((await listMine(otherCustomerToken, { bookingId })).items).toEqual([]);

      const provider = await listMine(providerToken);
      expect(provider.items.some((n) => n.type === 'booking_confirmed')).toBe(false);
      expect(provider.items.length).toBeGreaterThan(0);
      for (const item of provider.items) {
        expect(item).not.toHaveProperty('recipient');
        expect(item).not.toHaveProperty('password');
      }
    });

    it('works for administrators too', async () => {
      expect(await listMine(adminToken)).toEqual({ items: [], unreadCount: 0 });
    });

    it('validates the query', async () => {
      await http.get('/notifications/me').query({ bookingId: 'nope' }).set(auth(customerToken)).expect(400);
      await http.get('/notifications/me').query({ userId: customerId }).set(auth(otherCustomerToken)).expect(400);
    });
  });

  describe('UPDATE — PATCH /notifications/:id/read and /unread', () => {
    it('requires authentication', async () => {
      await http.patch(`/notifications/${confirmedNotificationId}/read`).expect(401);
      await http.patch(`/notifications/${confirmedNotificationId}/unread`).expect(401);
      const stored = await notifications.findById(confirmedNotificationId).lean().exec();
      expect(stored!.read).toBe(false);
    });

    it('lets the owner mark a notification as read and updates the database', async () => {
      const before = await listMine(customerToken);

      const res = await http
        .patch(`/notifications/${confirmedNotificationId}/read`)
        .set(auth(customerToken))
        .expect(200);
      expect(res.body).toMatchObject({ id: confirmedNotificationId, read: true });
      expect(res.body.readAt).toEqual(expect.any(String));

      const stored = await notifications.findById(confirmedNotificationId).lean().exec();
      expect(stored!.read).toBe(true);
      expect(stored!.readAt).toBeInstanceOf(Date);

      const after = await listMine(customerToken);
      expect(after.unreadCount).toBe(before.unreadCount - 1);
      expect(after.items.find((n) => n.id === confirmedNotificationId)?.read).toBe(true);

      // Marking it read again is harmless.
      await http.patch(`/notifications/${confirmedNotificationId}/read`).set(auth(customerToken)).expect(200);
      expect((await listMine(customerToken)).unreadCount).toBe(after.unreadCount);
    });

    it('lets the owner mark it as unread again', async () => {
      const res = await http
        .patch(`/notifications/${confirmedNotificationId}/unread`)
        .set(auth(customerToken))
        .expect(200);
      expect(res.body).toMatchObject({ read: false, readAt: null });

      const stored = await notifications.findById(confirmedNotificationId).lean().exec();
      expect(stored!.read).toBe(false);
      expect(stored!.readAt).toBeUndefined();
    });

    it('does not let any other user change it (404, database unchanged)', async () => {
      for (const token of [otherCustomerToken, providerToken, adminToken]) {
        await http.patch(`/notifications/${confirmedNotificationId}/read`).set(auth(token)).expect(404);
      }
      const stored = await notifications.findById(confirmedNotificationId).lean().exec();
      expect(stored!.read).toBe(false);

      await http.patch(`/notifications/${confirmedNotificationId}/read`).set(auth(customerToken)).expect(200);
      for (const token of [otherCustomerToken, providerToken, adminToken]) {
        await http.patch(`/notifications/${confirmedNotificationId}/unread`).set(auth(token)).expect(404);
      }
      expect((await notifications.findById(confirmedNotificationId).lean().exec())!.read).toBe(true);
    });

    it('handles unknown and malformed ids safely', async () => {
      const missing = new Types.ObjectId().toString();
      const res = await http.patch(`/notifications/${missing}/read`).set(auth(customerToken)).expect(404);
      expect(res.body.message).toBe('Notification not found');
      await http.patch(`/notifications/${missing}/unread`).set(auth(customerToken)).expect(404);
      await http.patch('/notifications/not-an-id/read').set(auth(customerToken)).expect(400);
    });
  });
});
