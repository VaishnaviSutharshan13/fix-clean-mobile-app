import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { sriLankaNow } from './../src/bookings/booking-dates.js';
import { Complaint } from './../src/complaints/schemas/complaint.schema.js';
import { ProviderProfile } from './../src/providers/schemas/provider-profile.schema.js';
import { Role, User } from './../src/users/schemas/user.schema.js';

function futureDate(days: number): string {
  const [y, m, d] = sriLankaNow().date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

const PASSWORD = 'Secret123';
const ADMIN = { email: 'admin@example.com', password: 'AdminPass123' };

const providerSignup = (name: string, email: string) => ({
  name,
  email,
  phone: '0771234567',
  password: PASSWORD,
  category: 'plumbing',
  serviceArea: 'Jaffna',
  experienceYears: 6,
});

const services = {
  visitFee: 500,
  services: [
    { name: 'Tap Repair', description: 'Fix leaking taps', price: 2000 },
    { name: 'Pipe Leak Diagnostics', price: 2500 },
  ],
};

describe('Admin module (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let http: ReturnType<typeof request>;
  let users: Model<User>;
  let profiles: Model<ProviderProfile>;
  let complaints: Model<Complaint>;

  let adminToken: string;
  let adminId: string;
  let customerToken: string;
  let customerId: string;
  let otherCustomerToken: string;
  let newProviderToken: string; // registered in the test, approved by admin
  let newProviderId: string;
  let rejectedProviderToken: string;
  let rejectedProviderId: string;
  let bookingId: string;
  let complaintId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const asAdmin = (req: request.Test) => req.set(auth(adminToken));

  const register = async (kind: 'customer' | 'provider', body: object) => {
    const res = await http.post(`/auth/register/${kind}`).send(body).expect(201);
    return res.body as { accessToken: string; user: { id: string } };
  };

  const customerSeesProvider = async (id: string): Promise<boolean> => {
    const list = await http.get('/providers').set(auth(customerToken)).expect(200);
    return (list.body as { id: string }[]).some((p) => p.id === id);
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
    profiles = app.get<Model<ProviderProfile>>(getModelToken(ProviderProfile.name));
    complaints = app.get<Model<Complaint>>(getModelToken(Complaint.name));

    // Admins can't self-register, so the account is created directly.
    const admin = await users.create({
      name: 'Platform Admin',
      email: ADMIN.email,
      phone: '0112345678',
      password: await bcrypt.hash(ADMIN.password, 12),
      role: Role.Admin,
    });
    adminId = String(admin._id);
    const login = await http.post('/auth/login').send(ADMIN).expect(200);
    adminToken = login.body.accessToken;

    const customer = await register('customer', {
      name: 'Nadeesha Perera',
      email: 'nadeesha@example.com',
      phone: '0779876543',
      password: PASSWORD,
    });
    customerToken = customer.accessToken;
    customerId = customer.user.id;

    const other = await register('customer', {
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
      phone: '0779876500',
      password: PASSWORD,
    });
    otherCustomerToken = other.accessToken;
  });

  afterAll(async () => {
    await connection?.dropDatabase();
    await app?.close();
  });

  describe('authorization', () => {
    const routes: [string, string][] = [
      ['get', '/admin/dashboard'],
      ['get', '/admin/providers'],
      ['get', '/admin/users'],
      ['get', '/admin/bookings'],
      ['get', '/admin/complaints'],
      ['patch', `/admin/providers/${new Types.ObjectId().toString()}/verify`],
      ['patch', `/admin/users/${new Types.ObjectId().toString()}/status`],
    ];

    it.each(routes)('%s %s → 401 without a token', async (method, path) => {
      await (http as any)[method](path).expect(401);
    });

    it.each(routes)('%s %s → 403 for a customer', async (method, path) => {
      await (http as any)[method](path).set(auth(customerToken)).send({ isActive: false }).expect(403);
    });

    it.each(routes)('%s %s → 403 for a provider', async (method, path) => {
      const provider = await register('provider', providerSignup('Probe Provider', `probe.${Math.random()}@example.com`));
      await (http as any)[method](path).set(auth(provider.accessToken)).send({ isActive: false }).expect(403);
      await profiles.deleteOne({ user: new Types.ObjectId(provider.user.id) });
      await users.deleteOne({ _id: provider.user.id });
    });

    it('allows the admin', async () => {
      for (const [method, path] of routes.filter(([m]) => m === 'get')) {
        await (asAdmin((http as any)[method](path)) as request.Test).expect(200);
      }
    });

    it('rejects a tampered token with 401', async () => {
      await http.get('/admin/dashboard').set(auth(`${adminToken}x`)).expect(401);
    });

    it('has no admin registration endpoint and ignores role in sign up', async () => {
      await http.post('/auth/register/admin').send({}).expect(404);
      const res = await http
        .post('/auth/register/customer')
        .send({ name: 'Sneaky', email: 'sneaky@example.com', phone: '0771112223', password: PASSWORD, role: 'admin' })
        .expect(400);
      expect(res.body.message).toContain('property role should not exist');
    });
  });

  describe('provider verification (approve)', () => {
    it('lists a newly registered provider as pending and hides them from customers', async () => {
      const provider = await register('provider', providerSignup('Sunil Fernando', 'sunil.new@example.com'));
      newProviderToken = provider.accessToken;
      newProviderId = provider.user.id;

      const res = await asAdmin(http.get('/admin/providers?status=pending')).expect(200);
      const item = res.body.items.find((p: { id: string }) => p.id === newProviderId);
      expect(item).toMatchObject({
        name: 'Sunil Fernando',
        category: 'plumbing',
        serviceArea: 'Jaffna',
        experienceYears: 6,
        verificationStatus: 'pending',
        servicesCount: 0,
      });
      // Lists don't expose contact details.
      expect(item.email).toBeUndefined();
      expect(item.phone).toBeUndefined();
      expect(res.body.counts.pending).toBeGreaterThanOrEqual(1);

      expect(await customerSeesProvider(newProviderId)).toBe(false);
      await http.get(`/providers/${newProviderId}`).set(auth(customerToken)).expect(404);
    });

    it('shows full details and refuses approval while there are no services', async () => {
      const details = await asAdmin(http.get(`/admin/providers/${newProviderId}`)).expect(200);
      expect(details.body).toMatchObject({
        id: newProviderId,
        email: 'sunil.new@example.com',
        phone: '0771234567',
        verificationStatus: 'pending',
        services: [],
        approval: { ready: false },
      });
      expect(details.body.approval.problems).toContain('The provider has not proposed any services & rates yet.');
      expect(JSON.stringify(details.body)).not.toMatch(/password|\$2[aby]\$/);

      const res = await asAdmin(http.patch(`/admin/providers/${newProviderId}/verify`)).expect(400);
      expect(res.body.message).toContain('The provider has not proposed any services & rates yet.');
      const profile = await profiles.findOne({ user: new Types.ObjectId(newProviderId) }).lean();
      expect(profile?.verificationStatus).toBe('pending');
    });

    it('shows proposed services and requires the verification checks', async () => {
      await http.put('/provider/services').set(auth(newProviderToken)).send(services).expect(200);

      const details = await asAdmin(http.get(`/admin/providers/${newProviderId}`)).expect(200);
      expect(details.body.services).toHaveLength(2);
      expect(details.body.services[0]).toMatchObject({ name: 'Tap Repair', description: 'Fix leaking taps', price: 2000 });
      expect(details.body.visitFee).toBe(500);
      expect(details.body.approval.problems).toEqual([
        'Identity check has not been confirmed.',
        'Contact check has not been confirmed.',
        'Experience check has not been confirmed.',
      ]);

      const res = await asAdmin(http.patch(`/admin/providers/${newProviderId}/verify`)).expect(400);
      expect(res.body.message).toContain('Identity check has not been confirmed.');
    });

    it('validates the checks payload', async () => {
      await asAdmin(http.patch(`/admin/providers/${newProviderId}/checks`)).send({}).expect(400);
      const res = await asAdmin(http.patch(`/admin/providers/${newProviderId}/checks`))
        .send({ identity: true, verificationStatus: 'verified' })
        .expect(400);
      expect(res.body.message).toContain('property verificationStatus should not exist');
      await asAdmin(http.patch(`/admin/providers/${newProviderId}/checks`)).send({ identity: 'yes' }).expect(400);
    });

    it('saves checks, then approves the provider', async () => {
      const partial = await asAdmin(http.patch(`/admin/providers/${newProviderId}/checks`))
        .send({ identity: true, contact: true })
        .expect(200);
      expect(partial.body.verificationChecks).toEqual({ identity: true, contact: true, experience: false });
      expect(partial.body.approval.ready).toBe(false);

      const full = await asAdmin(http.patch(`/admin/providers/${newProviderId}/checks`))
        .send({ experience: true })
        .expect(200);
      expect(full.body.approval).toEqual({ ready: true, problems: [] });

      const res = await asAdmin(http.patch(`/admin/providers/${newProviderId}/verify`)).expect(200);
      expect(res.body).toMatchObject({ verificationStatus: 'verified', reviewedBy: 'Platform Admin' });
      expect(res.body.verifiedAt).toEqual(expect.any(String));
    });

    it('shows the provider as verified in their own portal', async () => {
      const me = await http.get('/provider/me').set(auth(newProviderToken)).expect(200);
      expect(me.body).toMatchObject({
        verificationStatus: 'verified',
        verificationChecks: { identity: true, contact: true, experience: true },
        rejectionReason: null,
      });
    });

    it('makes the provider visible, viewable and bookable for customers', async () => {
      expect(await customerSeesProvider(newProviderId)).toBe(true);
      const details = await http.get(`/providers/${newProviderId}`).set(auth(customerToken)).expect(200);
      expect(details.body.services.map((s: { name: string; price: number }) => [s.name, s.price])).toEqual([
        ['Tap Repair', 2000],
        ['Pipe Leak Diagnostics', 2500],
      ]);

      const booking = await http
        .post('/bookings')
        .set(auth(customerToken))
        .send({
          providerId: newProviderId,
          serviceId: details.body.services[0].id,
          scheduledDate: futureDate(2),
          timeSlot: '10:00-12:00',
          address: { street: '25 Kandy Road', city: 'Jaffna', landmark: '' },
          problemDescription: 'Kitchen tap leaking',
        })
        .expect(201);
      bookingId = booking.body.id;

      const requests = await http.get('/provider/bookings?scope=requests').set(auth(newProviderToken)).expect(200);
      expect(requests.body.map((b: { id: string }) => b.id)).toContain(bookingId);
    });

    it('rejects invalid transitions once verified', async () => {
      const again = await asAdmin(http.patch(`/admin/providers/${newProviderId}/verify`)).expect(409);
      expect(again.body.message).toBe('This provider has already been verified.');
      await asAdmin(http.patch(`/admin/providers/${newProviderId}/reject`)).send({}).expect(409);
      await asAdmin(http.patch(`/admin/providers/${newProviderId}/checks`)).send({ identity: false }).expect(409);
    });

    it('keeps a verified provider verified when they edit services, and flags the change', async () => {
      await http
        .put('/provider/services')
        .set(auth(newProviderToken))
        .send({ ...services, services: [{ name: 'Tap Repair', price: 2200 }] })
        .expect(200);
      const details = await asAdmin(http.get(`/admin/providers/${newProviderId}`)).expect(200);
      expect(details.body.verificationStatus).toBe('verified');
      expect(details.body.servicesChangedSinceApproval).toBe(true);
      expect(await customerSeesProvider(newProviderId)).toBe(true);
    });

    it('returns 400 for malformed ids and 404 for unknown providers', async () => {
      await asAdmin(http.get('/admin/providers/not-an-id')).expect(400);
      await asAdmin(http.get(`/admin/providers/${new Types.ObjectId().toString()}`)).expect(404);
      await asAdmin(http.patch(`/admin/providers/${new Types.ObjectId().toString()}/verify`)).expect(404);
    });
  });

  describe('provider verification (reject)', () => {
    it('rejects a pending provider with a reason the provider can see', async () => {
      const provider = await register('provider', providerSignup('Ruwan Bandara', 'ruwan.new@example.com'));
      rejectedProviderToken = provider.accessToken;
      rejectedProviderId = provider.user.id;
      await http.put('/provider/services').set(auth(rejectedProviderToken)).send(services).expect(200);

      await asAdmin(http.patch(`/admin/providers/${rejectedProviderId}/reject`))
        .send({ reason: 'x'.repeat(301) })
        .expect(400);
      const res = await asAdmin(http.patch(`/admin/providers/${rejectedProviderId}/reject`))
        .send({ reason: 'Could not confirm experience.' })
        .expect(200);
      expect(res.body).toMatchObject({ verificationStatus: 'rejected', rejectionReason: 'Could not confirm experience.' });

      const me = await http.get('/provider/me').set(auth(rejectedProviderToken)).expect(200);
      expect(me.body).toMatchObject({ verificationStatus: 'rejected', rejectionReason: 'Could not confirm experience.' });
    });

    it('keeps the rejected provider hidden and unbookable', async () => {
      expect(await customerSeesProvider(rejectedProviderId)).toBe(false);
      await http.get(`/providers/${rejectedProviderId}`).set(auth(customerToken)).expect(404);
      const account = await http.get('/provider/me').set(auth(rejectedProviderToken)).expect(200);
      await http
        .post('/bookings')
        .set(auth(customerToken))
        .send({
          providerId: rejectedProviderId,
          serviceId: account.body.services[0].id,
          scheduledDate: futureDate(2),
          timeSlot: '10:00-12:00',
          address: { street: '1 Main Street', city: 'Jaffna' },
          problemDescription: 'Leak',
        })
        .expect(404);
    });

    it('cannot approve a rejected provider', async () => {
      const res = await asAdmin(http.patch(`/admin/providers/${rejectedProviderId}/verify`)).expect(409);
      expect(res.body.message).toBe('This provider has already been rejected.');
    });

    it('filters the verification list by status', async () => {
      const rejected = await asAdmin(http.get('/admin/providers?status=rejected')).expect(200);
      expect(rejected.body.items.map((p: { id: string }) => p.id)).toEqual([rejectedProviderId]);
      const verified = await asAdmin(http.get('/admin/providers?status=verified&search=sunil')).expect(200);
      expect(verified.body.items.map((p: { id: string }) => p.id)).toEqual([newProviderId]);
      await asAdmin(http.get('/admin/providers?status=approved')).expect(400);
    });
  });

  describe('providers and customers cannot verify', () => {
    it('blocks a provider from verifying themselves', async () => {
      const provider = await register('provider', providerSignup('Self Verifier', 'self.verify@example.com'));
      await http.put('/provider/services').set(auth(provider.accessToken)).send(services).expect(200);

      await http.patch(`/admin/providers/${provider.user.id}/verify`).set(auth(provider.accessToken)).expect(403);
      await http
        .patch(`/admin/providers/${provider.user.id}/checks`)
        .set(auth(provider.accessToken))
        .send({ identity: true })
        .expect(403);
      const bad = await http
        .put('/provider/services')
        .set(auth(provider.accessToken))
        .send({ ...services, verificationStatus: 'verified', verificationChecks: { identity: true } })
        .expect(400);
      expect(bad.body.message).toEqual(
        expect.arrayContaining([
          'property verificationStatus should not exist',
          'property verificationChecks should not exist',
        ]),
      );

      const me = await http.get('/provider/me').set(auth(provider.accessToken)).expect(200);
      expect(me.body.verificationStatus).toBe('pending');
    });

    it('blocks a customer from verifying a provider', async () => {
      const pending = await asAdmin(http.get('/admin/providers?status=pending&search=self')).expect(200);
      const id = pending.body.items[0].id;
      await http.patch(`/admin/providers/${id}/verify`).set(auth(customerToken)).expect(403);
      await http.patch(`/admin/providers/${id}/reject`).set(auth(customerToken)).send({}).expect(403);
      expect(await customerSeesProvider(id)).toBe(false);
    });
  });

  describe('user management', () => {
    it('lists users without password hashes', async () => {
      const res = await asAdmin(http.get('/admin/users')).expect(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(5);
      expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/);
      const provider = res.body.items.find((u: { id: string }) => u.id === newProviderId);
      expect(provider).toMatchObject({
        role: 'provider',
        isActive: true,
        provider: { verificationStatus: 'verified', category: 'plumbing', serviceArea: 'Jaffna' },
      });
      expect(res.body.counts).toMatchObject({ admin: 1, customer: 2, suspended: 0 });
    });

    it('filters by role and searches by name or email', async () => {
      const customers = await asAdmin(http.get('/admin/users?role=customer')).expect(200);
      expect(customers.body.items.every((u: { role: string }) => u.role === 'customer')).toBe(true);
      expect(customers.body.items).toHaveLength(2);

      const search = await asAdmin(http.get('/admin/users?search=NADEESHA')).expect(200);
      expect(search.body.items.map((u: { id: string }) => u.id)).toEqual([customerId]);
      await asAdmin(http.get('/admin/users?role=superuser')).expect(400);
    });

    it('returns user details with activity counts', async () => {
      const res = await asAdmin(http.get(`/admin/users/${customerId}`)).expect(200);
      expect(res.body).toMatchObject({
        id: customerId,
        role: 'customer',
        canChangeStatus: true,
        bookingStats: { total: 1, active: 1 },
      });
      expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/);
      const self = await asAdmin(http.get(`/admin/users/${adminId}`)).expect(200);
      expect(self.body.canChangeStatus).toBe(false);
    });

    it('suspends a customer: login refused and existing token revoked', async () => {
      const res = await asAdmin(http.patch(`/admin/users/${customerId}/status`)).send({ isActive: false }).expect(200);
      expect(res.body).toMatchObject({ isActive: false, suspendedAt: expect.any(String) });

      const login = await http.post('/auth/login').send({ email: 'nadeesha@example.com', password: PASSWORD }).expect(403);
      expect(login.body.message).toContain('suspended');
      await http.get('/bookings/me').set(auth(customerToken)).expect(401);

      const suspended = await asAdmin(http.get('/admin/users?status=suspended')).expect(200);
      expect(suspended.body.items.map((u: { id: string }) => u.id)).toEqual([customerId]);
    });

    it('reactivates the customer', async () => {
      await asAdmin(http.patch(`/admin/users/${customerId}/status`)).send({ isActive: true }).expect(200);
      const login = await http.post('/auth/login').send({ email: 'nadeesha@example.com', password: PASSWORD }).expect(200);
      customerToken = login.body.accessToken;
      await http.get('/bookings/me').set(auth(customerToken)).expect(200);
    });

    it('hides a suspended provider from customers until reactivated', async () => {
      await asAdmin(http.patch(`/admin/users/${newProviderId}/status`)).send({ isActive: false }).expect(200);
      expect(await customerSeesProvider(newProviderId)).toBe(false);
      await http.get(`/providers/${newProviderId}`).set(auth(customerToken)).expect(404);

      await asAdmin(http.patch(`/admin/users/${newProviderId}/status`)).send({ isActive: true }).expect(200);
      expect(await customerSeesProvider(newProviderId)).toBe(true);
      const login = await http.post('/auth/login').send({ email: 'sunil.new@example.com', password: PASSWORD }).expect(200);
      newProviderToken = login.body.accessToken;
    });

    it('protects the admin from suspending themselves or other admins', async () => {
      const self = await asAdmin(http.patch(`/admin/users/${adminId}/status`)).send({ isActive: false }).expect(400);
      expect(self.body.message).toBe('You cannot suspend or reactivate your own account.');

      const other = await users.create({
        name: 'Second Admin',
        email: 'admin2@example.com',
        phone: '0112345679',
        password: await bcrypt.hash(ADMIN.password, 12),
        role: Role.Admin,
      });
      const res = await asAdmin(http.patch(`/admin/users/${String(other._id)}/status`)).send({ isActive: false }).expect(400);
      expect(res.body.message).toBe('Administrator accounts cannot be suspended from the app.');
      await users.deleteOne({ _id: other._id });
    });

    it('validates the status payload and blocks role changes', async () => {
      await asAdmin(http.patch(`/admin/users/${customerId}/status`)).send({}).expect(400);
      const res = await asAdmin(http.patch(`/admin/users/${customerId}/status`))
        .send({ isActive: true, role: 'admin' })
        .expect(400);
      expect(res.body.message).toContain('property role should not exist');
      const stored = await users.findById(customerId).lean();
      expect(stored?.role).toBe('customer');
    });
  });

  describe('booking monitoring', () => {
    it('lists system bookings with customer, provider and status', async () => {
      const res = await asAdmin(http.get('/admin/bookings')).expect(200);
      const item = res.body.items.find((b: { id: string }) => b.id === bookingId);
      expect(item).toMatchObject({
        status: 'requested',
        service: { name: 'Tap Repair', category: 'plumbing' },
        city: 'Jaffna',
        customer: { id: customerId, name: 'Nadeesha Perera' },
        provider: { id: newProviderId, name: 'Sunil Fernando' },
        lastUpdate: { status: 'requested' },
      });
      // Monitoring shows the city only, not the exact street address.
      expect(JSON.stringify(item)).not.toContain('Kandy Road');
      expect(res.body.counts).toMatchObject({ all: 1, requested: 1, confirmed: 0 });
    });

    it('filters by status and searches by reference or name', async () => {
      const requested = await asAdmin(http.get('/admin/bookings?status=requested')).expect(200);
      expect(requested.body.items).toHaveLength(1);
      const confirmed = await asAdmin(http.get('/admin/bookings?status=confirmed')).expect(200);
      expect(confirmed.body.items).toHaveLength(0);
      const byName = await asAdmin(http.get('/admin/bookings?search=sunil')).expect(200);
      expect(byName.body.items).toHaveLength(1);
      await asAdmin(http.get('/admin/bookings?status=pending')).expect(400);
    });

    it('reflects provider status changes and shows who made them', async () => {
      await http.patch(`/provider/bookings/${bookingId}/accept`).set(auth(newProviderToken)).expect(200);
      const res = await asAdmin(http.get(`/admin/bookings/${bookingId}`)).expect(200);
      expect(res.body.status).toBe('confirmed');
      expect(res.body.statusHistory.map((h: { status: string; by: { role: string } }) => [h.status, h.by.role])).toEqual([
        ['requested', 'customer'],
        ['confirmed', 'provider'],
      ]);
      expect(res.body.problemDescription).toBe('Kitchen tap leaking');
    });

    it('is read-only for admins', async () => {
      await asAdmin(http.patch(`/admin/bookings/${bookingId}`)).send({ status: 'completed' }).expect(404);
      await asAdmin(http.patch(`/admin/bookings/${bookingId}/status`)).send({ status: 'completed' }).expect(404);
      await asAdmin(http.patch(`/provider/bookings/${bookingId}/on-the-way`)).expect(403);
    });
  });

  describe('complaints', () => {
    it('lets a customer file a complaint about their own booking', async () => {
      const res = await http
        .post('/complaints')
        .set(auth(customerToken))
        .send({
          bookingId,
          category: 'no_show',
          subject: 'Provider arrived late',
          description: 'The provider arrived two hours after the booked window.',
        })
        .expect(201);
      expect(res.body).toMatchObject({ status: 'open', reference: expect.stringMatching(/^CP-/) });
      complaintId = res.body.id;
    });

    it('validates complaint submission and ownership', async () => {
      const body = { bookingId, category: 'pricing', subject: 'Charged too much', description: 'Charged more than quoted.' };
      await http.post('/complaints').set(auth(customerToken)).send(body).expect(409);
      await http.post('/complaints').set(auth(otherCustomerToken)).send(body).expect(404);
      await http.post('/complaints').set(auth(newProviderToken)).send(body).expect(403);
      await http.post('/complaints').set(auth(customerToken)).send({ ...body, status: 'resolved' }).expect(400);
      await http.post('/complaints').set(auth(customerToken)).send({ ...body, subject: 'x' }).expect(400);
    });

    it('lists and reads complaints for the admin', async () => {
      const list = await asAdmin(http.get('/admin/complaints')).expect(200);
      expect(list.body.items).toHaveLength(1);
      expect(list.body.items[0]).toMatchObject({
        id: complaintId,
        status: 'open',
        category: 'no_show',
        customer: { name: 'Nadeesha Perera' },
        provider: { name: 'Sunil Fernando' },
        booking: { id: bookingId, serviceName: 'Tap Repair' },
      });
      expect(list.body.counts).toMatchObject({ all: 1, open: 1, in_review: 0, resolved: 0 });

      const details = await asAdmin(http.get(`/admin/complaints/${complaintId}`)).expect(200);
      expect(details.body.allowedTransitions).toEqual(['in_review', 'resolved']);
      expect(details.body.statusHistory[0]).toMatchObject({ status: 'open', by: { role: 'customer' } });
    });

    it('moves a complaint open → in review', async () => {
      const res = await asAdmin(http.patch(`/admin/complaints/${complaintId}/status`))
        .send({ status: 'in_review', note: 'Contacting the provider.' })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'in_review', allowedTransitions: ['resolved'] });
    });

    it('rejects invalid transitions and unknown fields', async () => {
      const back = await asAdmin(http.patch(`/admin/complaints/${complaintId}/status`)).send({ status: 'open' }).expect(409);
      expect(back.body.message).toBe("This complaint is in review and can't be moved to open.");
      await asAdmin(http.patch(`/admin/complaints/${complaintId}/status`)).send({ status: 'closed' }).expect(400);
      await asAdmin(http.patch(`/admin/complaints/${complaintId}/status`))
        .send({ status: 'resolved', note: 'Refund issued', customer: customerId })
        .expect(400);
    });

    it('requires a resolution note, then resolves and persists', async () => {
      const noNote = await asAdmin(http.patch(`/admin/complaints/${complaintId}/status`))
        .send({ status: 'resolved' })
        .expect(400);
      expect(noNote.body.message).toContain('resolution note');

      const res = await asAdmin(http.patch(`/admin/complaints/${complaintId}/status`))
        .send({ status: 'resolved', note: 'Provider warned; visit fee refunded.' })
        .expect(200);
      expect(res.body).toMatchObject({
        status: 'resolved',
        resolutionNote: 'Provider warned; visit fee refunded.',
        allowedTransitions: [],
      });

      const stored = await complaints.findById(complaintId).lean();
      expect(stored?.status).toBe('resolved');
      expect(stored?.resolvedAt).toBeInstanceOf(Date);
      expect(stored?.statusHistory.map((h) => h.status)).toEqual(['open', 'in_review', 'resolved']);

      await asAdmin(http.patch(`/admin/complaints/${complaintId}/status`)).send({ status: 'in_review' }).expect(409);
    });

    it('filters complaints by status', async () => {
      const open = await asAdmin(http.get('/admin/complaints?status=open')).expect(200);
      expect(open.body.items).toHaveLength(0);
      const resolved = await asAdmin(http.get('/admin/complaints?status=resolved')).expect(200);
      expect(resolved.body.items).toHaveLength(1);
    });
  });

  describe('dashboard', () => {
    it('returns real counts from the database', async () => {
      const res = await asAdmin(http.get('/admin/dashboard')).expect(200);
      expect(res.body.users).toEqual({
        total: 6, // admin, 2 customers, 3 providers (new, rejected, self-verifier)
        customers: 2,
        providers: 3,
        admins: 1,
        suspended: 0,
      });
      expect(res.body.providers).toEqual({ pending: 1, verified: 1, rejected: 1, bookable: 1 });
      expect(res.body.bookings).toMatchObject({
        total: 1,
        active: 1,
        completed: 0,
        cancelledOrDeclined: 0,
        byStatus: { requested: 0, confirmed: 1, on_the_way: 0, completed: 0, declined: 0, cancelled: 0 },
      });
      expect(res.body.complaints).toEqual({ open: 0, inReview: 0, resolved: 1, unresolved: 0 });
      expect(res.body.pendingVerifications.map((p: { name: string }) => p.name)).toEqual(['Self Verifier']);
      expect(res.body.recentBookings[0].id).toBe(bookingId);
    });

    it('updates counts when data changes', async () => {
      await asAdmin(http.patch(`/admin/users/${customerId}/status`)).send({ isActive: false }).expect(200);
      const res = await asAdmin(http.get('/admin/dashboard')).expect(200);
      expect(res.body.users.suspended).toBe(1);
      await asAdmin(http.patch(`/admin/users/${customerId}/status`)).send({ isActive: true }).expect(200);
    });
  });
});
