# Test Summary Report — Final Integration Pass

**Project:** FIX & CLEAN CO. — Sri Lanka Home Services (IT3060 HCI, Milestone 03)
**Branch:** `feature/testing-aruldino` (based on merged `main` at `77541e2`)
**Date:** 5 Oct 2026 · **Tester:** Aruldino T (testing / integration / QA)

> **Android device/emulator UI testing was not completed; responsive mobile web testing was
> used because the emulator was unstable.**

## 1. Scope

The pass covered the integrated Customer, Service Provider and Admin modules, with the
backend API and the Expo frontend tested together:

- authentication and role-based authorization for all three roles
- provider sign-up → admin verification → customer visibility → booking lifecycle
- availability enforcement, location privacy, complaints, user management, booking monitoring
- error and edge cases, and responsive layout at two mobile viewport sizes

Out of scope: Android/iOS device testing, performance/load testing, and usability sessions
with participants (a plan is ready in [USABILITY_TEST_PLAN.md](USABILITY_TEST_PLAN.md)).

## 2. Environment

| Item | Value |
|---|---|
| OS | Linux 6.8 (Ubuntu) |
| Node.js / Yarn | v25.7.0 / 1.22.22 |
| MongoDB | Local `mongod` (127.0.0.1:27017) |
| Backend | NestJS 12, Mongoose 9, Vitest 4, oxlint |
| Frontend | Expo SDK 57, React Native 0.86, Expo Router, TypeScript 6 |
| Browser for UI checks | Google Chrome (headless, mobile emulation via DevTools protocol) |
| Databases | e2e: `fix-clean-co-test` (dropped by each spec). Manual QA: a temporary `fix-clean-co-qa` DB seeded with `yarn seed` and dropped afterwards. The developer DB in `backend/.env` was not used. |

## 3. Test types

| Type | What it means here |
|---|---|
| **Automated tests** | Backend unit tests, backend e2e tests (real NestJS app + MongoDB over HTTP), frontend unit tests, TypeScript check, lint, expo-doctor |
| **Manual / scripted responsive web tests** | Expo web export served locally and driven in headless Chrome at 412×915 and 360×780: every assigned screen rendered and checked for overflow, plus screenshots reviewed by eye and click-through flows using the real buttons |
| **Android bundle build validation** | `expo export --platform android` only. This proves the JavaScript bundle compiles for Android. **It is not Android device or UI testing.** |

## 4. Automated test results (final code)

| Check | Command | Result |
|---|---|---|
| Backend build | `yarn build` | Passed |
| Backend lint | `yarn lint` (oxlint) | Passed: 0 errors, 0 warnings |
| Backend unit tests | `yarn test` | **11 passed / 0 failed / 0 skipped** (2 files) |
| Backend e2e tests | `yarn test:e2e` | **163 passed / 0 failed / 0 skipped** (6 files) |
| Frontend TypeScript | `yarn typecheck` | Passed |
| Frontend unit tests | `yarn test` | **49 passed / 0 failed / 0 skipped** (5 files) |
| expo-doctor | `yarn expo-doctor` | 21/21 checks passed |
| Web export | `npx expo export --platform web` | Succeeded |
| Android bundle export | `npx expo export --platform android` | Succeeded (build validation only) |

e2e breakdown: admin 61, auth 24, customer 19, provider 27, app 1, **integration 31 (new)**.

**Baseline before any change in this pass:** build, lint, unit 11/11, e2e 132/132, frontend
48/48, expo-doctor 21/21, and both exports all passed. The only warnings were 17 Mongoose
deprecation warnings (DEF-03). The increase to 163 e2e tests and 49 frontend tests comes from
the tests added in this pass.

**Remaining warning:** Vitest prints an advisory that the `vite-tsconfig-paths` plugin can be
replaced by Vite's native option. It is informational and does not affect results.

## 5. Manual integration tests

New file `backend/test/integration.e2e-spec.ts` drives the full **Provider → Admin →
Customer → Provider** flow using only each role's real API (the `dev:booking-status` CLI
is not used):

1. Provider signs up (`pending`) and proposes services and rates.
2. Customer cannot list, search, view or book the pending provider.
3. Admin sees the request. Approval is refused while checks are incomplete; after all checks it is approved (re-approve and reject both return 409).
4. Provider portal shows `verified`. Customer now sees the exact services and prices.
5. Customer books. The provider receives the request with **city only** (no street, landmark or phone in the JSON).
6. Provider accepts → customer sees `confirmed`; address and phones are shared.
7. Duplicate accept, decline-after-accept and complete-before-on-the-way all return 409.
8. On the way → customer sees it and can no longer cancel. Completed → final.
9. MongoDB `statusHistory` records `requested(customer) → confirmed → on_the_way → completed (provider)` in order.
10. Admin monitoring shows the booking and a timeline with actor roles, and no street or phone numbers. There is no mutation route (404).
11. A separate booking is declined with a reason, which the customer sees.

The same lifecycle was then repeated **through the UI** at both viewports by pressing the
real buttons (Accept Job → Start trip / Mark 'On the way' → Mark as completed, with the
confirm dialog). 16/16 checks passed at 360×780 and 16/16 at 412×915. With Track Booking
left open, the live status banner appeared for Confirmed, On the Way, Completed and
Declined (12–15 s after each action in one observed run).

## 6. Responsive testing

- 40 screen states × 2 viewports = **80 renders**, covering all assigned Customer (12),
  Provider (8 verified + 3 pending), Admin (12) and auth (5) screens, with stress data:
  100-character names, a Rs 1,000,000 service, a Rs 10,000 visiting fee, a 500-character
  problem description and a 1,000-character complaint.
- Automated checks per render: page horizontal overflow, elements extending past the
  viewport (excluding intentional horizontal scrollers) and error text. Screenshots of the
  highest-risk screens were reviewed by eye.
- Result: 0 overflow at either size. One genuine defect, the KPI value truncation (DEF-02),
  was fixed and retested. Two cosmetic observations are recorded (OBS-01, OBS-02).
- Figma regression: the only UI change is the KPI value text (DEF-02). Layout, sizes, fonts
  and colours are unchanged. No other screen was modified.

## 7. Security testing

All of the following were verified by automated e2e tests:

- 401 without or with a tampered token; 403 for the wrong role (customer/provider → admin,
  customer → provider API, provider → customer API).
- No admin sign-up route; `role`, `verificationStatus` and `verificationChecks` are rejected
  by the validation whitelist on sign-up, services and availability.
- Providers cannot verify themselves (403) or access other providers' bookings (404).
  Customers cannot access other customers' bookings or complaints (404).
- Suspended users: login 403, existing token 401, and suspended providers are hidden from
  customers and unbookable.
- Password hashes never appear in auth or admin responses.

## 8. Defects

See [DEFECT_LOG.md](DEFECT_LOG.md).

| ID | Severity | Summary | Status |
|---|---|---|---|
| DEF-01 | Medium | Rescheduling bypassed checks when the provider was no longer bookable | Fixed + regression test |
| DEF-02 | Low | Booking Monitor "Active value" unreadable for totals ≥ Rs 1M | Fixed + unit test |
| DEF-03 | Low | Mongoose `new: true` deprecation warnings | Fixed |
| DEF-04 | Low | Root README had stale git notes instead of project instructions | Fixed |

## 9. Known limitations

- **No Android device/emulator UI testing.** Responsive mobile web was used instead.
- No usability sessions with real participants yet; the plan and templates are ready.
- Status notifications use polling (about 15 s); there are no push notifications.
- Customers cannot submit reviews or complaints in the UI (complaints are API only;
  reviews come from seed data).
- No performance or load measurements were taken.
- See the observations OBS-01…05 in the defect log.

## 10. Final readiness

**Ready for demonstration on the Expo web build at mobile viewport sizes.** All automated
checks pass, the full three-role lifecycle works through both the API and the UI, and all
defects found were fixed and retested. Still outstanding: a human usability evaluation, and
(if required by the assessors) native Android UI testing.
