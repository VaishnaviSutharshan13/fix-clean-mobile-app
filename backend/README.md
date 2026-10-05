# FIX & CLEAN CO. — Backend (NestJS)

NestJS + MongoDB (Mongoose) REST API with JWT authentication.

## Setup

```bash
cd backend
yarn install
cp .env.example .env   # set MONGODB_URI and JWT_SECRET (openssl rand -hex 64)
yarn seed              # optional: development demo data (see below)
yarn start:dev         # http://localhost:3000
```

## Commands

```bash
yarn build             # compile to dist/
yarn lint              # oxlint
yarn test              # unit tests
yarn test:e2e          # e2e tests (uses the separate "fix-clean-co-test" database)
yarn seed              # reset development demo data
yarn dev:booking-status <reference> <status>   # simulate provider status changes (dev only)
```

## Development demo data (`yarn seed`)

`yarn seed` inserts sample data so the Customer, Provider and Admin flows can be
demonstrated. **This is development/test data, not production functionality.**
It refuses to run when `NODE_ENV=production`.

What it creates (in the database from `MONGODB_URI`):

- 8 providers with profiles — 7 **verified** (shown to customers) and
  1 **pending** (`ruwan.bandara@…`, never shown to customers)
- 3 customers and 1 **admin** account (admins can't self-register)
- 11 past **completed** bookings, each with a review, so ratings, review counts
  and "jobs done" are calculated from real documents
- 5 bookings in the other statuses (requested, confirmed, on the way, cancelled,
  declined) for Admin Booking Monitoring — they also appear in those seed
  providers' portals
- 3 sample **complaints** (open, in review, resolved) for Admin Complaints / Disputes

What it resets, on every run:

- Seed accounts (emails ending in `@seed.fixclean.lk`) and their provider
  profiles are **updated in place with fixed ids**: names, prices, passwords
  and verification status go back to the values in the script.
- The 16 sample bookings (references `FC-SEED01`–`FC-SEED16`), their reviews and
  the sample complaints (`CP-SEED01`–`CP-SEED03`) are deleted and recreated.
- Seed accounts suspended during a demo are reactivated, and the pending seed
  provider goes back to `pending`.

The result is the same every time. Accounts you registered in the app, and the
bookings they made (including bookings with seed providers), are **not** deleted
and stay valid, because the seed providers keep the same ids and service ids.

The first run after upgrading from an older version of this script replaces
older seed accounts that had random ids (one-time migration).

### Seed accounts

All seed accounts use the password `SeedPass123` (override with the
`SEED_PASSWORD` environment variable when running `yarn seed`).

| Role | Email |
|---|---|
| Admin | `admin@seed.fixclean.lk` (sign in through **Admin Login**) |
| Customer | `kumari.perera@seed.fixclean.lk` (has past completed bookings) |
| Customer | `ahamed.rizvi@seed.fixclean.lk` |
| Customer | `lakshmi.sivakumar@seed.fixclean.lk` |
| Provider | `sunil.fernando@seed.fixclean.lk` (plumbing, Jaffna) |
| Provider | `kasun.perera@seed.fixclean.lk` (plumbing, Colombo) |
| Provider | `dinesh.silva@seed.fixclean.lk` (plumbing, Kankesanthurai) |
| Provider | `nuwan.jayasinghe@seed.fixclean.lk` (electrical, Colombo) |
| Provider | `tharindu.wickramasinghe@seed.fixclean.lk` (electrical, Kandy) |
| Provider | `malini.gunawardena@seed.fixclean.lk` (cleaning, Colombo) |
| Provider | `priya.navaratnam@seed.fixclean.lk` (cleaning, Jaffna) |
| Provider (pending) | `ruwan.bandara@seed.fixclean.lk` |

Provider accounts can sign in through **Provider Login** and manage their booking requests,
jobs and availability. Seed providers are already verified; providers who register in
the app start as `pending` until the Admin module verifies them.

## Provider account lifecycle

1. **Provider Sign Up** (`POST /auth/register/provider`) creates the user (role
   `provider`, assigned by the server, bcrypt-hashed password) and a linked
   `ProviderProfile` with the chosen trade (`category`), operating district and
   experience. `verificationStatus` starts as **`pending`** and no services.
2. **Pending provider** can sign in, see the Dashboard and verification banner,
   manage availability, and propose **Services & Rates** (`PUT /provider/services`,
   on the Manage Availability screen): service names, prices (LKR) and visiting fee.
   Proposing services never verifies the provider.
3. **Admin verification** (Admin module): the administrator opens the request,
   reviews the profile, proposed services, prices and visiting fee, confirms the
   **identity, contact and experience** checks (manual confirmations stored in
   `verificationChecks`; the app collects no documents and does no automated ID
   checks) and then **approves** (`pending → verified`) or **rejects**
   (`pending → rejected`, optional reason shown to the provider). The server only
   allows approval when the account is active, the profile is complete, there is
   at least one service with a valid price (≥ Rs. 100) and all three checks are
   confirmed; otherwise it returns 400 with the list of problems. Only pending
   applications can be reviewed (409 otherwise); rejection is final in the app.
4. **Customer visibility**: customers only see providers that are `verified` **and**
   have at least one service. Pending, rejected or service-less providers never
   appear in Home, Provider List, search, categories or Provider Details, and can't
   be booked.
5. **Booking requests**: customers book within the provider's availability; the
   provider sees the request without the exact address or phone (NFR5).
6. **Accept / Decline** → **On the Way** → **Completed**, all performed in the
   Provider screens and shown live on the customer's Track Booking.

Seed providers are created already verified with services, so they are bookable
immediately.

**Services & Rates after verification (policy):** prices stay provider-controlled.
A verified provider who edits Services & Rates remains verified and bookable;
the change is timestamped (`servicesUpdatedAt`) and Verification Details shows an
"edited after approval" notice so administrators can review it. Existing bookings
keep their price snapshot.

## Testing status

- Backend unit and e2e tests cover auth, customer, provider and admin flows (`yarn test`, `yarn test:e2e`).
- The full Provider → Admin → Customer → Provider flow (sign up, services, admin approval,
  customer booking, accept → on the way → completed) and the rejection flow were tested in
  the Expo **web** app at 412×915 and 360×780.
- **Android Admin UI testing has NOT been completed**: responsive mobile web testing was
  used because the Android emulator was unstable.
- The Customer ↔ Provider flow has been tested end to end in the Expo **web** app at
  mobile viewport sizes (412×915 and 360×780).
- **Android Provider UI testing has NOT been completed yet**: the Android emulator on
  the development machine was unstable (it repeatedly shut down), so mobile web testing
  was used instead.

## Provider API

All routes need a provider JWT (`JwtAuthGuard` + `RolesGuard`, role `provider`) and only
ever return the signed-in provider's own data.

| Method | Path | Purpose |
|---|---|---|
| GET | `/provider/me` | Own profile, verification state and availability |
| PUT | `/provider/availability` | Save duty status, working days and shift windows |
| PUT | `/provider/services` | Propose services (name, price ≥ Rs. 100) and visiting fee; 1–10 services |
| GET | `/provider/dashboard` | Real counts, next job, upcoming jobs, recent requests |
| GET | `/provider/bookings?scope=requests\|active\|history\|all` | Own bookings |
| GET | `/provider/bookings/:id` | One own booking |
| PATCH | `/provider/bookings/:id/accept` | requested → confirmed |
| PATCH | `/provider/bookings/:id/decline` | requested → declined (optional `reason`) |
| PATCH | `/provider/bookings/:id/on-the-way` | confirmed → on_the_way |
| PATCH | `/provider/bookings/:id/complete` | on_the_way → completed |

The customer's exact address and phone are only included once a booking is confirmed (NFR5).

## Admin API

Every route needs a valid JWT (401 otherwise) **and** the `admin` role (403 for
customers and providers): `JwtAuthGuard` + `RolesGuard` + `@Roles(Role.Admin)` on
the controller. Unknown body fields are rejected (400), so `role`,
`verificationStatus` or `verificationChecks` can never be mass-assigned. Responses
are built field by field and never include password hashes.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/dashboard` | Live counts (users, providers, bookings, complaints), verification queue, latest bookings |
| GET | `/admin/providers?status=pending\|verified\|rejected\|all&search=` | Verification requests (pending = oldest first) |
| GET | `/admin/providers/:id` | Full application: contact, trade, district, experience, services, prices, visiting fee, availability, checks, approval readiness |
| PATCH | `/admin/providers/:id/checks` | Save identity / contact / experience confirmations (pending only) |
| PATCH | `/admin/providers/:id/verify` | `pending → verified` (validated, see lifecycle) |
| PATCH | `/admin/providers/:id/reject` | `pending → rejected`, optional `reason` (≤ 300 chars) |
| GET | `/admin/users?role=&status=active\|suspended&search=` | Users |
| GET | `/admin/users/:id` | User details with booking / complaint counts |
| PATCH | `/admin/users/:id/status` | `{ isActive }` — suspend or reactivate a customer/provider (not admins, not yourself) |
| GET | `/admin/bookings?status=&search=` | All bookings (read-only monitoring) |
| GET | `/admin/bookings/:id` | Booking with status history and who made each change |
| GET | `/admin/complaints?status=&search=` | Complaints |
| GET | `/admin/complaints/:id` | Complaint with history and allowed transitions |
| PATCH | `/admin/complaints/:id/status` | `open → in_review → resolved` (or `open → resolved`); resolving requires a `note` |

- **Suspension**: suspended users get 403 at sign-in, their existing tokens stop
  working (401) and suspended providers disappear from customer discovery and
  can't be booked. Accounts are never deleted from the app.
- **Booking monitoring is read-only**: there are no admin booking-status routes;
  only the city is shown (no street address or phone numbers). "Live dispatch"
  means live booking status (the screen refreshes every 15 s) — there is no GPS,
  map, distance or ETA.
- **Complaints**: customers file one with `POST /complaints` (`bookingId`,
  `category`, `subject`, `description`) about one of their own bookings; one
  unresolved complaint per booking. There is no customer complaint screen yet,
  so the demo uses the seeded complaints or the API.

## Simulating provider status changes (development only)

The Provider screens now perform these transitions for real. The command below remains
available as a developer shortcut (e.g. for scripted demos) and follows the same rules:

```bash
yarn dev:booking-status FC-ABC123 confirmed
yarn dev:booking-status FC-ABC123 on_the_way
yarn dev:booking-status FC-ABC123 completed
yarn dev:booking-status FC-XYZ789 declined     # only from "requested"
```

- The booking reference is shown on Booking Confirmation and Track Booking.
- It follows the same transition rules as the API (`src/bookings/booking-status.ts`),
  so it cannot skip steps or reopen finished bookings.
- It is a command-line tool only: there is no HTTP endpoint and nothing in the
  Customer app can trigger it. It refuses to run when `NODE_ENV=production`.
- Track Booking polls every 15 seconds, so the change and its notification
  appear on the device within about 15 seconds.

## Cleaning up demo records

`yarn seed` never deletes accounts you created yourself. To remove one demo
customer and all of their bookings (replace the email):

```bash
mongosh fix-clean-co --eval '
  const u = db.users.findOne({ email: "demo.customer@example.com" });
  if (u) { db.bookings.deleteMany({ customer: u._id }); db.users.deleteOne({ _id: u._id }); }
'
```

To start completely fresh (deletes **everything** in the development database),
drop it and re-seed:

```bash
mongosh fix-clean-co --eval 'db.dropDatabase()' && yarn seed
```
