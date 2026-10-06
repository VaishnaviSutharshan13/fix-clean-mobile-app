import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { sriLankaNow } from './../src/bookings/booking-dates.js';
import { ProviderProfile, VerificationStatus } from './../src/providers/schemas/provider-profile.schema.js';

// Profile photos: PUT/DELETE /users/me/avatar (owner only) and GET /users/:id/avatar,
// plus the photo URL in auth, provider and booking views.

function futureDate(days: number): string {
  const [y, m, d] = sriLankaNow().date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

// Smallest valid PNG (1×1 transparent pixel).
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const pngDataUrl = `data:image/png;base64,${PNG_1PX.toString('base64')}`;

describe('Profile photos (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let http: ReturnType<typeof request>;
  let customerToken: string;
  let customerId: string;
  let providerToken: string;
  let providerId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    http = request(app.getHttpServer());
    connection = app.get<Connection>(getConnectionToken());
    if (!connection.name.endsWith('-test')) throw new Error(`Refusing to run e2e tests against "${connection.name}"`);
    await connection.dropDatabase();
    await connection.syncIndexes();

    const customer = await http
      .post('/auth/register/customer')
      .send({ name: 'Photo Customer', email: 'photo.customer@example.com', phone: '0779876543', password: 'Secret123' })
      .expect(201);
    customerToken = customer.body.accessToken;
    customerId = customer.body.user.id;
    expect(customer.body.user.avatarUrl).toBeNull();

    const provider = await http
      .post('/auth/register/provider')
      .send({
        name: 'Photo Pro',
        email: 'photo.pro@example.com',
        phone: '0771234567',
        password: 'Secret123',
        category: 'plumbing',
        serviceArea: 'Jaffna',
        experienceYears: 5,
      })
      .expect(201);
    providerToken = provider.body.accessToken;
    providerId = provider.body.user.id;
    await http
      .put('/provider/services')
      .set(auth(providerToken))
      .send({ visitFee: 500, services: [{ name: 'Tap Repair', price: 2000 }] })
      .expect(200);
    // Make the provider bookable without going through the admin screens.
    await app
      .get<Model<ProviderProfile>>(getModelToken(ProviderProfile.name))
      .updateOne({ user: new Types.ObjectId(providerId) }, { $set: { verificationStatus: VerificationStatus.Verified } });
  });

  afterAll(async () => {
    await connection?.dropDatabase();
    await app?.close();
  });

  it('requires authentication to change a photo', async () => {
    await http.put('/users/me/avatar').send({ image: pngDataUrl }).expect(401);
    await http.delete('/users/me/avatar').expect(401);
  });

  it('rejects files that are not real images', async () => {
    const res = await http
      .put('/users/me/avatar')
      .set(auth(customerToken))
      .send({ image: `data:image/png;base64,${Buffer.from('not an image').toString('base64')}` })
      .expect(400);
    expect(res.body.message).toBe('The photo must be a JPEG, PNG or WebP image.');
    await http.put('/users/me/avatar').set(auth(customerToken)).send({ image: 'hello' }).expect(400);
    await http.put('/users/me/avatar').set(auth(customerToken)).send({}).expect(400);
  });

  it('lets a user upload their own photo and serves it publicly', async () => {
    const res = await http.put('/users/me/avatar').set(auth(customerToken)).send({ image: pngDataUrl }).expect(200);
    expect(res.body.avatarUrl).toMatch(new RegExp(`^/users/${customerId}/avatar\\?v=\\d+$`));

    const img = await http.get(res.body.avatarUrl).expect(200);
    expect(img.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(img.body as Buffer, PNG_1PX)).toBe(0);

    const profile = await http.get('/auth/profile').set(auth(customerToken)).expect(200);
    expect(profile.body.avatarUrl).toBe(res.body.avatarUrl);
  });

  it('shows the provider photo on provider cards, details and the customer booking', async () => {
    const upload = await http.put('/users/me/avatar').set(auth(providerToken)).send({ image: pngDataUrl }).expect(200);
    const url = upload.body.avatarUrl as string;

    const list = await http.get('/providers').set(auth(customerToken)).expect(200);
    expect((list.body as { id: string; avatarUrl: string }[]).find((p) => p.id === providerId)?.avatarUrl).toBe(url);
    const details = await http.get(`/providers/${providerId}`).set(auth(customerToken)).expect(200);
    expect(details.body.avatarUrl).toBe(url);
    const me = await http.get('/provider/me').set(auth(providerToken)).expect(200);
    expect(me.body.avatarUrl).toBe(url);

    const booking = await http
      .post('/bookings')
      .set(auth(customerToken))
      .send({
        providerId,
        serviceId: details.body.services[0].id,
        scheduledDate: futureDate(2),
        timeSlot: '10:00-12:00',
        address: { street: '1 Test Lane', city: 'Jaffna' },
        problemDescription: 'Leaking tap',
      })
      .expect(201);
    expect(booking.body.provider.avatarUrl).toBe(url);

    const job = await http.get(`/provider/bookings/${booking.body.id}`).set(auth(providerToken)).expect(200);
    expect(job.body.customer.avatarUrl).toMatch(new RegExp(`^/users/${customerId}/avatar`));
  });

  it('lets the owner remove their photo', async () => {
    await http.delete('/users/me/avatar').set(auth(customerToken)).expect(200, { avatarUrl: null });
    await http.get(`/users/${customerId}/avatar`).expect(404);
    const profile = await http.get('/auth/profile').set(auth(customerToken)).expect(200);
    expect(profile.body.avatarUrl).toBeNull();
  });

  it('returns 404 / 400 for unknown or malformed user ids', async () => {
    await http.get(`/users/${new Types.ObjectId().toString()}/avatar`).expect(404);
    await http.get('/users/not-an-id/avatar').expect(400);
  });
});
