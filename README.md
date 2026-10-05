# FIX & CLEAN CO. — Sri Lanka Home Services

A mobile home-service booking app that connects customers with **verified** plumbers,
electricians and cleaners. It is built with React Native (Expo, Expo Router, TypeScript),
NestJS, MongoDB (Mongoose), JWT authentication and REST APIs.

IT3060 Human Computer Interaction — Milestone 03.

| Folder | Contents | Details |
|---|---|---|
| `backend/` | NestJS REST API | [backend/README.md](backend/README.md): API reference, seed data, provider lifecycle |
| `frontend/` | Expo app (Customer, Provider and Admin screens) | [frontend/README.md](frontend/README.md) |
| `docs/testing/` | Final test evidence | [Test summary](docs/testing/TEST_SUMMARY.md), [functional test cases](docs/testing/FUNCTIONAL_TEST_CASES.md), [traceability matrix](docs/testing/TRACEABILITY_MATRIX.md), [defect log](docs/testing/DEFECT_LOG.md), [usability test plan](docs/testing/USABILITY_TEST_PLAN.md), [demo script](docs/testing/DEMO_SCRIPT.md) |

## Prerequisites

- Node.js (the final test pass used v25.7.0) and Yarn 1 (`yarn@1.22`)
- MongoDB: either a local server (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas cluster
- Google Chrome (or another modern browser) for the Expo web app

## Setup

```bash
# Backend
cd backend
yarn install
cp .env.example .env
# Edit .env: set MONGODB_URI (local or Atlas) and JWT_SECRET (e.g. `openssl rand -hex 64`).
# Never commit .env; .env.example must only contain placeholders.
yarn seed              # demo data: customers, providers, admin, bookings, complaints
yarn start:dev         # API on http://localhost:3000

# Frontend (second terminal)
cd frontend
yarn install
cp .env.example .env   # optional: EXPO_PUBLIC_API_BASE_URL (empty = same machine, port 3000)
yarn web               # Expo web app; use a mobile viewport such as 412×915
```

`yarn start` (Expo Go / Android) is also available; see `frontend/README.md` for how to
reach the backend from a phone or emulator.

## Demo accounts

Created by `yarn seed`. All accounts use the password `SeedPass123` (development data only).

| Role | Email | Sign in through |
|---|---|---|
| Admin | `admin@seed.fixclean.lk` | Admin Login (admins cannot self-register) |
| Customer | `kumari.perera@seed.fixclean.lk` | Customer Login |
| Provider (verified) | `sunil.fernando@seed.fixclean.lk` | Provider Login |
| Provider (pending) | `ruwan.bandara@seed.fixclean.lk` | Provider Login |

The full list is in [backend/README.md](backend/README.md#seed-accounts).

## Main workflows

- **Customer:** sign up / log in → discover verified providers (ratings, reviews, services,
  prices) → book within the provider's availability → track status with in-app
  notifications → modify or cancel while allowed.
- **Provider:** sign up (pending) → propose services & rates and availability → admin
  verification → receive requests (city only) → accept or decline → on the way → completed.
  The exact address and phone are shared only after acceptance.
- **Admin:** dashboard → verification requests → review, confirm checks, approve or reject →
  user management (suspend or reactivate) → read-only booking monitoring → complaints
  (open → in review → resolved).

A step-by-step three-role demo is in [docs/testing/DEMO_SCRIPT.md](docs/testing/DEMO_SCRIPT.md).

## Tests

```bash
cd backend
yarn build && yarn lint
yarn test              # unit tests
yarn test:e2e          # e2e tests (separate local "fix-clean-co-test" database)

cd ../frontend
yarn typecheck
yarn test              # unit tests
yarn expo-doctor
npx expo export --platform web       # web build
```

The e2e tests use `MONGODB_URI_TEST` if it is set, otherwise
`mongodb://127.0.0.1:27017/fix-clean-co-test`. They refuse to run against a database whose
name does not end in `-test`.

Testing status: automated suites and responsive mobile web testing (412×915 and 360×780).
**Android device/emulator UI testing was not completed**, because the emulator was unstable.
See [docs/testing/TEST_SUMMARY.md](docs/testing/TEST_SUMMARY.md).
