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

The Provider (onboarding) and Admin (verification) modules are not built yet,
so `yarn seed` inserts sample data so the Customer flow can be demonstrated.
**This is development/test data, not production functionality.** It refuses to
run when `NODE_ENV=production`.

What it creates (in the database from `MONGODB_URI`):

- 8 providers with profiles — 7 **verified** (shown to customers) and
  1 **pending** (`ruwan.bandara@…`, never shown to customers)
- 3 customers
- 11 past **completed** bookings, each with a review, so ratings, review counts
  and "jobs done" are calculated from real documents

What it resets, on every run:

- Seed accounts (emails ending in `@seed.fixclean.lk`) and their provider
  profiles are **updated in place with fixed ids**: names, prices, passwords
  and verification status go back to the values in the script.
- The 11 sample bookings (references `FC-SEED01`–`FC-SEED11`) and their reviews
  are deleted and recreated.

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

Provider accounts can log in, but the Provider screens are not implemented yet.

## Simulating provider status changes (development only)

Customers can only cancel their own bookings. Confirming, declining, starting
("on the way") and completing belong to the future Provider module. Until it
exists, use this command to move a booking along so Track Booking, its
status-change notification and the phone-visibility rules can be tested:

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
