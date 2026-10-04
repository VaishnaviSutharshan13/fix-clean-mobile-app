import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Connection, Model } from 'mongoose';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { JwtAuthGuard } from './../src/auth/jwt.guard.js';
import { Roles } from './../src/auth/roles.decorator.js';
import { RolesGuard } from './../src/auth/roles.guard.js';
import { Role, User } from './../src/users/schemas/user.schema.js';

// Test-only routes used to exercise the Roles decorator and RolesGuard.
@Controller('test-roles')
@UseGuards(JwtAuthGuard, RolesGuard)
class RoleTestController {
  @Get('customer')
  @Roles(Role.Customer)
  customerOnly() {
    return { ok: true };
  }

  @Get('provider')
  @Roles(Role.Provider)
  providerOnly() {
    return { ok: true };
  }

  @Get('admin')
  @Roles(Role.Admin)
  adminOnly() {
    return { ok: true };
  }
}

const customer = {
  name: 'Nimal Perera',
  email: 'Nimal@Example.com',
  phone: '0771234567',
  password: 'Secret123',
};
const provider = {
  name: 'Kamal Silva',
  email: 'kamal.provider@example.com',
  phone: '+94712345678',
  password: 'Provider123',
  // Provider Sign Up also collects trade, district and experience.
  category: 'plumbing',
  serviceArea: 'Colombo',
  experienceYears: 5,
};
const admin = { email: 'admin@example.com', password: 'AdminPass123' };

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  const tokens: Partial<Record<Role, string>> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [RoleTestController],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    if (!connection.name.endsWith('-test')) {
      throw new Error(`Refusing to run e2e tests against "${connection.name}"`);
    }
    await connection.dropDatabase();
    await connection.syncIndexes();

    // Admins cannot self-register, so seed one directly.
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    await userModel.create({
      name: 'Admin',
      email: admin.email,
      phone: '0112345678',
      password: await bcrypt.hash(admin.password, 12),
      role: Role.Admin,
    });
  });

  afterAll(async () => {
    await connection?.dropDatabase();
    await app?.close();
  });

  describe('registration', () => {
    it('registers a customer and returns a token without the password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register/customer')
        .send(customer)
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toEqual({
        id: expect.any(String),
        name: customer.name,
        email: 'nimal@example.com',
        phone: customer.phone,
        role: 'customer',
      });
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('stores a bcrypt hash, never the plain-text password', async () => {
      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const stored = await userModel
        .findOne({ email: 'nimal@example.com' })
        .select('+password')
        .lean();
      expect(stored?.password).not.toBe(customer.password);
      expect(stored?.password).toMatch(/^\$2[aby]\$12\$/);
    });

    it('registers a provider', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register/provider')
        .send(provider)
        .expect(201);
      expect(res.body.user.role).toBe('provider');
    });

    it('rejects a duplicate email (case-insensitive) with 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register/provider')
        .send({ ...provider, email: 'NIMAL@example.com' })
        .expect(409);
      expect(res.body.message).toBe('An account with this email already exists');
    });

    it('rejects an attempt to self-assign the admin role with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register/customer')
        .send({ ...customer, email: 'sneaky@example.com', role: 'admin' })
        .expect(400);
      expect(res.body.message).toContain('property role should not exist');
    });

    it('has no admin registration endpoint', async () => {
      await request(app.getHttpServer())
        .post('/auth/register/admin')
        .send({ ...customer, email: 'sneaky@example.com' })
        .expect(404);
    });

    it('validates required fields, email, phone and password strength', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register/customer')
        .send({ name: '', email: 'not-an-email', phone: '123', password: 'short' })
        .expect(400);
      const messages: string[] = res.body.message;
      expect(messages).toEqual(
        expect.arrayContaining([
          'Name is required',
          'Email must be a valid email address',
          'Phone must be a valid Sri Lankan phone number',
          'Password must be at least 8 characters long',
          'Password must contain at least one letter and one number',
        ]),
      );
    });
  });

  describe('login', () => {
    it.each([
      [Role.Customer, customer.email, customer.password],
      [Role.Provider, provider.email, provider.password],
      [Role.Admin, admin.email, admin.password],
    ])('logs in a %s and returns the role', async (role, email, password) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      expect(res.body.user.role).toBe(role);
      expect(JSON.stringify(res.body)).not.toContain('password');
      tokens[role] = res.body.accessToken;
    });

    it('rejects a wrong password with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: customer.email, password: 'WrongPass123' })
        .expect(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects an unknown email with the same 401 message', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'Whatever123' })
        .expect(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects malformed login input with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bad' })
        .expect(400);
    });
  });

  describe('GET /auth/profile (JWT protected)', () => {
    it('returns the current user for a valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${tokens.customer}`)
        .expect(200);
      expect(res.body).toMatchObject({ email: 'nimal@example.com', role: 'customer' });
      expect(res.body.password).toBeUndefined();
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('returns 401 for a tampered token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${tokens.customer}x`)
        .expect(401);
    });
  });

  describe('role-based authorization', () => {
    it.each([
      [Role.Customer, 'customer', 200],
      [Role.Customer, 'provider', 403],
      [Role.Customer, 'admin', 403],
      [Role.Provider, 'provider', 200],
      [Role.Provider, 'admin', 403],
      [Role.Admin, 'admin', 200],
      [Role.Admin, 'customer', 403],
    ])('%s → /test-roles/%s returns %i', async (role, route, status) => {
      await request(app.getHttpServer())
        .get(`/test-roles/${route}`)
        .set('Authorization', `Bearer ${tokens[role]}`)
        .expect(status);
    });

    it('returns 401 (not 403) on a role-protected route without a token', async () => {
      await request(app.getHttpServer()).get('/test-roles/admin').expect(401);
    });
  });
});
