# Functional Test Cases — FIX & CLEAN CO.

IT3060 Human Computer Interaction · Milestone 03 · Final integration pass
Branch: `feature/testing-aruldino` · Executed: 5 Oct 2026 · Tester: Aruldino T

## How to read this document

- **Status** is one of **Pass**, **Fail** or **Not Run**. A test is marked Pass only if it was
  actually executed during the final pass and produced the expected result.
- **Evidence** codes in *Actual Result*:
  - `E2E:<file>` — automated backend e2e test in `backend/test/<file>.e2e-spec.ts`
    (`yarn test:e2e`, real NestJS app + MongoDB test database).
  - `UNIT-BE` / `UNIT-FE` — backend (`yarn test`) / frontend (`yarn test`) unit tests.
  - `WEB-UI` — manual/scripted check in the Expo **web** build in headless Chrome at mobile
    viewports **412×915** and **360×780**, against a separately seeded local QA database.
    This is responsive mobile web testing, **not** Android device testing.
- **Preconditions** shared by most cases: backend running with MongoDB; `yarn seed` data or
  accounts created by the test itself; the provider under test is verified unless stated.

## Summary

| Area | Cases | Pass | Fail | Not Run |
|---|---|---|---|---|
| Authentication (AUTH) | 12 | 12 | 0 | 0 |
| Authorization / Security (SEC) | 10 | 10 | 0 | 0 |
| Customer (CUS) | 14 | 14 | 0 | 0 |
| Provider (PRO) | 12 | 12 | 0 | 0 |
| Provider Verification (VER) | 8 | 8 | 0 | 0 |
| Booking lifecycle (BOOK) | 10 | 10 | 0 | 0 |
| Availability (AVL) | 5 | 5 | 0 | 0 |
| Privacy (PRIV) | 5 | 5 | 0 | 0 |
| Admin (ADM) | 10 | 10 | 0 | 0 |
| Complaint Management (CMP) | 7 | 7 | 0 | 0 |
| Edge cases (EDGE) | 8 | 8 | 0 | 0 |
| Responsive UI (UI) | 8 | 7 | 0 | 1 |
| **Total** | **109** | **108** | **0** | **1** |

The single Not Run case (UI-TC-08) is Android device/emulator UI testing.

---

## Authentication

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| AUTH-TC-01 | Auth | Customer sign up | Register a customer | None | POST `/auth/register/customer` with valid name, email, LK phone, password | 201; token returned; role `customer`; no password field | As expected — E2E:auth | Pass |
| AUTH-TC-02 | Auth | Registration validation | Invalid sign-up input | None | Submit missing name, bad email, non-LK phone, weak/short password | 400 with field messages | As expected — E2E:auth | Pass |
| AUTH-TC-03 | Auth | Unique email | Duplicate email (different case) | Customer exists | Register again with upper-case email | 409 | As expected — E2E:auth | Pass |
| AUTH-TC-04 | Auth | Valid login | Customer logs in | Seed customer | Customer Login form, valid credentials | Lands on `/customer/home` | As expected — WEB-UI (both viewports) + E2E:auth | Pass |
| AUTH-TC-05 | Auth | Invalid password / email | Wrong password and unknown email | Account exists | POST `/auth/login` with wrong password; with unknown email | 401 with the same generic message for both | As expected — E2E:auth; WEB-UI admin form stays on login | Pass |
| AUTH-TC-06 | Auth | Provider sign up | Register a provider | None | POST `/auth/register/provider` with trade, district, experience | 201; profile `pending`, no services | As expected — E2E:provider, E2E:integration | Pass |
| AUTH-TC-07 | Auth | Provider registration validation | Invalid trade/district/experience | None | Submit invalid category, unknown district, out-of-range experience | 400 | As expected — E2E:provider | Pass |
| AUTH-TC-08 | Auth | Pending provider login | Pending provider signs in | Pending provider | POST `/auth/login` | 200, role `provider`, no hash in body | As expected — E2E:integration | Pass |
| AUTH-TC-09 | Auth | Admin login | Admin signs in through Admin Login | Seed admin | Admin Login form, valid credentials | Lands on `/admin/dashboard` | As expected — WEB-UI (both viewports) | Pass |
| AUTH-TC-10 | Auth | Role-specific login screens | Customer / provider credentials on Admin Login | Seed accounts | Enter customer, then provider credentials in Admin Login | "This is a customer account…" / "…service provider account…"; no session; stays on login | As expected — WEB-UI (both viewports) | Pass |
| AUTH-TC-11 | Auth | Session restoration | Reload with stored token | Signed in as admin | Reload `/admin/dashboard` | Session restored via `/auth/profile`, stays on dashboard | As expected — WEB-UI | Pass |
| AUTH-TC-12 | Auth | No public admin sign-up | Attempt admin registration | None | POST `/auth/register/admin`; POST customer sign-up with `role: admin` | 404; 400 "property role should not exist" | As expected — E2E:auth, E2E:admin | Pass |

## Authorization / Security

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| SEC-TC-01 | Security | Admin API protected | Unauthenticated admin call | None | GET/PATCH admin routes without token | 401 | As expected — E2E:admin (7 routes) | Pass |
| SEC-TC-02 | Security | Admin API role check | Customer and provider call admin API | Tokens for both | Call admin routes | 403 | As expected — E2E:admin, E2E:integration | Pass |
| SEC-TC-03 | Security | Admin allowed | Admin calls admin API | Admin token | GET admin routes | 200 | As expected — E2E:admin | Pass |
| SEC-TC-04 | Security | Customer cannot use provider API | Customer calls `/provider/*` | Customer token | GET `/provider/bookings`, `/provider/me`; PATCH accept | 403 | As expected — E2E:integration, E2E:provider | Pass |
| SEC-TC-05 | Security | Provider cannot use customer API | Provider calls customer routes | Provider token | GET `/bookings/me`, `/providers`; POST `/complaints` | 403 | As expected — E2E:integration | Pass |
| SEC-TC-06 | Security | Provider isolation | Provider reads another provider's booking | Two providers | GET / PATCH accept on other provider's booking | 404; list is empty | As expected — E2E:integration, E2E:provider | Pass |
| SEC-TC-07 | Security | Provider cannot self-verify | Provider calls verify | Pending provider | PATCH `/admin/providers/:self/verify` | 403 | As expected — E2E:admin | Pass |
| SEC-TC-08 | Security | No mass assignment | Send `role`, `verificationStatus`, `verificationChecks` | Provider token | In sign-up, `PUT /provider/services`, `PUT /provider/availability` | 400 "property … should not exist"; status stays pending, checks false | As expected — E2E:integration, E2E:provider, E2E:admin | Pass |
| SEC-TC-09 | Security | No password hashes | Inspect auth, admin user list/details | Users exist | Login, register, GET `/admin/users`, `/admin/users/:id` | No `password` field or bcrypt hash | As expected — E2E:auth, E2E:admin, E2E:integration | Pass |
| SEC-TC-10 | Security | Tampered token | Modified JWT | Valid token | Append a character, call protected route | 401 | As expected — E2E:auth, E2E:admin | Pass |

## Customer

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| CUS-TC-01 | Customer | Discovery | Home shows categories & providers | Seed data | Open Home | Categories with counts/starting price; verified providers | As expected — E2E:customer; WEB-UI | Pass |
| CUS-TC-02 | Customer | Provider list | Filter by category | Seed data | Provider List → Electrical | Only electrical, verified providers | As expected — E2E:customer; WEB-UI | Pass |
| CUS-TC-03 | Customer | Search | Search by name / service | Verified provider | Search "Meera", "Deep House" | Provider returned | As expected — E2E:integration | Pass |
| CUS-TC-04 | Customer | Empty search state | Search with no matches | Seed data | Search "zzzznone" | Empty list (200, `[]`); empty state shown | As expected — E2E:integration; WEB-UI | Pass |
| CUS-TC-05 | Customer | FR1 ratings/reviews | Provider details | Seed provider with reviews | Open Provider Details; GET `/reviews` | Rating average, review count, recent reviews from DB | As expected — E2E:customer | Pass |
| CUS-TC-06 | Customer | Services & prices | Real services after approval | Provider approved in test | GET `/providers/:id` | Exact service name, price, visit fee proposed by provider | As expected — E2E:integration | Pass |
| CUS-TC-07 | Customer | Book service | Create booking | Verified provider, available slot | POST `/bookings` | 201, `requested`, reference `FC-XXXXXX`, server-side total | As expected — E2E:customer, E2E:integration | Pass |
| CUS-TC-08 | Customer | Server-side pricing | Client sends price/customer/status | Customer token | POST `/bookings` with extra fields | 400 | As expected — E2E:customer, E2E:integration | Pass |
| CUS-TC-09 | Customer | Booking confirmation | Confirmation screen | Booking created | Open Booking Confirmation | Reference, provider, date/window, price | As expected — WEB-UI | Pass |
| CUS-TC-10 | Customer | Modify booking | Change requested booking | Requested booking | PATCH `/bookings/me/:id` (service/date) | Updated, price recalculated; blocked once confirmed (409) | As expected — E2E:customer | Pass |
| CUS-TC-11 | Customer | Cancel booking | Cancel requested/confirmed | Booking | PATCH `/bookings/me/:id/cancel` | `cancelled` with reason in history; blocked when on the way (409) | As expected — E2E:customer, E2E:integration | Pass |
| CUS-TC-12 | Customer | FR3 tracking | Track Booking shows status timeline | Booking in each status | Open Track Booking | Requested → Confirmed → On the Way → Completed timeline | As expected — WEB-UI | Pass |
| CUS-TC-13 | Customer | FR3 notification | Live status banner | Track Booking open | Provider accepts / on the way / completes / declines | Banner "Booking confirmed", "Provider on the way", "Service completed", "Booking declined" appears after the next poll | Observed 12–15 s after each action (single run, 15 s polling) — WEB-UI 360×780 | Pass |
| CUS-TC-14 | Customer | No fake GPS/ETA | On the Way state | Booking on the way | Open Track Booking | Scheduled window only; states live tracking is not available | "Live location tracking is not available." shown; no map/ETA — WEB-UI | Pass |

## Provider

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| PRO-TC-01 | Provider | FR2 pending status | New provider portal | Pending provider | GET `/provider/me`; open Dashboard | `pending`; verification banner | As expected — E2E:provider; WEB-UI | Pass |
| PRO-TC-02 | Provider | Rejection reason | Rejected provider portal | Admin rejected with reason | GET `/provider/me` | `rejected` + reason | As expected — E2E:admin, E2E:integration | Pass |
| PRO-TC-03 | Provider | Services & Rates | Save services | Provider | PUT `/provider/services` | Saved; ids stable on edit; status unchanged | As expected — E2E:provider, E2E:integration | Pass |
| PRO-TC-04 | Provider | Service validation | Invalid prices/fees | Provider | Price 99, 1,000,001, 150.5, "abc"; visit fee −1, 10,001 | 400 for each; Rs 1,000,000 accepted | As expected — E2E:integration, E2E:provider | Pass |
| PRO-TC-05 | Provider | Duplicate service names | Same name, different case | Provider | Save "Window Cleaning" + "window cleaning" | 400 | As expected — E2E:integration | Pass |
| PRO-TC-06 | Provider | FR5 availability persistence | Save duty/days/windows | Provider | PUT `/provider/availability` | Persisted and returned | As expected — E2E:provider | Pass |
| PRO-TC-07 | Provider | Dashboard counts | Counts from DB | Bookings exist | GET `/provider/dashboard` | Real pending/active/completed counts | As expected — E2E:provider; WEB-UI | Pass |
| PRO-TC-08 | Provider | FR4 receive request | Request appears | Customer booked | GET `/provider/bookings?scope=requests` | Booking listed | As expected — E2E:provider, E2E:integration | Pass |
| PRO-TC-09 | Provider | FR4 accept (UI) | Accept from Job Details | Requested booking | Press **Accept Job** | Booking `confirmed` | As expected — WEB-UI (both viewports) | Pass |
| PRO-TC-10 | Provider | On the way (UI) | Start trip | Confirmed booking | Service Details → **Start trip / Mark 'On the way'** | `on_the_way` | As expected — WEB-UI (both viewports) | Pass |
| PRO-TC-11 | Provider | Complete (UI) | Complete job | On the way | **Mark as completed** → confirm dialog | `completed` | As expected — WEB-UI (both viewports) | Pass |
| PRO-TC-12 | Provider | FR4 decline | Decline with reason | Requested booking | PATCH decline with reason | `declined`; customer sees reason | As expected — E2E:provider, E2E:integration | Pass |

## Provider Verification

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| VER-TC-01 | Verification | FR2 pending hidden | Pending provider with services | Pending provider | Customer list, search, details, booking | Not listed; details 404; booking 404 | As expected — E2E:integration, E2E:admin | Pass |
| VER-TC-02 | Verification | FR7 queue | Admin sees request | Pending provider | GET `/admin/providers?status=pending` | Listed | As expected — E2E:admin, E2E:integration | Pass |
| VER-TC-03 | Verification | Readiness: no services | Approve without services | Pending, no services | PATCH verify | 400 with problems | As expected — E2E:admin | Pass |
| VER-TC-04 | Verification | Readiness: incomplete checks | Approve with 1 of 3 checks | Pending with services | Save identity only; PATCH verify | 400 | As expected — E2E:integration, E2E:admin | Pass |
| VER-TC-05 | Verification | FR7 approve | Approve after all checks | Pending, services, checks | PATCH checks, PATCH verify | `verified`, reviewedBy admin; provider visible & bookable | As expected — E2E:integration, E2E:admin | Pass |
| VER-TC-06 | Verification | FR7 reject | Reject with reason | Pending provider | PATCH reject | `rejected`; hidden; unbookable | As expected — E2E:admin, E2E:integration | Pass |
| VER-TC-07 | Verification | Invalid transitions | Approve/reject a reviewed provider | Verified / rejected provider | Verify or reject again | 409 | As expected — E2E:integration, E2E:admin | Pass |
| VER-TC-08 | Verification | Suspended hidden | Suspend verified provider | Verified provider | Suspend; customer list/details/booking; reactivate | Hidden/404 while suspended; visible again after | As expected — E2E:integration, E2E:admin | Pass |

## Booking lifecycle

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| BOOK-TC-01 | Booking | FR3/FR4 accept | Provider accepts | Requested | PATCH accept; customer GET | Customer sees `confirmed`, provider phone revealed | As expected — E2E:integration | Pass |
| BOOK-TC-02 | Booking | FR3 on the way | Provider on the way | Confirmed | PATCH on-the-way; customer GET | `on_the_way`; cancel now 409 | As expected — E2E:integration | Pass |
| BOOK-TC-03 | Booking | FR3 completed | Provider completes | On the way | PATCH complete; customer GET | `completed`; full ordered history | As expected — E2E:integration | Pass |
| BOOK-TC-04 | Booking | FR4 declined | Provider declines | Requested | PATCH decline (reason) | Customer sees `declined` + reason, no provider phone | As expected — E2E:integration | Pass |
| BOOK-TC-05 | Booking | Duplicate accept | Accept twice | Confirmed | PATCH accept again | 409 | As expected — E2E:integration, E2E:provider | Pass |
| BOOK-TC-06 | Booking | Duplicate decline | Decline twice / accept after decline | Declined | PATCH decline, accept | 409 | As expected — E2E:integration | Pass |
| BOOK-TC-07 | Booking | Skip step | Complete before on the way | Confirmed | PATCH complete | 409 | As expected — E2E:integration, E2E:provider | Pass |
| BOOK-TC-08 | Booking | Finished is final | Act on completed/cancelled booking | Completed / cancelled | PATCH complete / accept | 409 | As expected — E2E:integration, E2E:provider | Pass |
| BOOK-TC-09 | Booking | MongoDB history | Stored transitions & actors | Completed booking | Read `bookings.statusHistory` directly | requested(customer) → confirmed → on_the_way → completed (provider), chronological | As expected — E2E:integration | Pass |
| BOOK-TC-10 | Booking | Customer cannot set provider statuses | Customer tries provider transitions | Customer token | Call provider actions / PATCH status | 403 / 400 | As expected — E2E:customer, E2E:integration | Pass |

## Availability

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| AVL-TC-01 | Availability | FR5 valid | On duty, valid day & window | Provider works that weekday/window | POST `/bookings` | 201 | As expected — E2E:integration | Pass |
| AVL-TC-02 | Availability | FR5 window | Outside time windows | Only 08:00–10:00 offered | Book 16:00–18:00 | 409 "…time window…" | As expected — E2E:integration, E2E:provider | Pass |
| AVL-TC-03 | Availability | FR5 day | Non-working day | Day removed from working days | Book that date | 409 "…doesn't work on that day…" | As expected — E2E:integration, E2E:provider | Pass |
| AVL-TC-04 | Availability | FR5 off duty | Provider off duty | `isAvailable: false` | Book | 409 "…not accepting new bookings…"; details show unavailable | As expected — E2E:integration, E2E:provider | Pass |
| AVL-TC-05 | Availability | FR5 reschedule | Reschedule into unavailable window / to a suspended provider | Requested booking | PATCH `/bookings/me/:id` new window | 409 (window) / 404 (provider no longer available) | As expected after fix DEF-01 — E2E:integration | Pass |

## Location privacy

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| PRIV-TC-01 | Privacy | FR6 before confirmation (API) | Provider views request | Requested | GET provider list and booking | Only `location.city`; no street, landmark or customer phone anywhere in JSON | As expected — E2E:integration, E2E:provider | Pass |
| PRIV-TC-02 | Privacy | FR6 before confirmation (UI) | Provider opens Service Details | Requested | Open Customer Location | "Customer location is locked"; street not rendered | As expected — WEB-UI | Pass |
| PRIV-TC-03 | Privacy | FR6 after confirmation | Provider accepts | Requested | Accept; GET booking / open Service Details | Street, landmark and phone shown | As expected — E2E:integration; WEB-UI | Pass |
| PRIV-TC-04 | Privacy | Declined stays private | Declined booking | Declined | GET provider booking | No street | As expected — E2E:integration | Pass |
| PRIV-TC-05 | Privacy | Admin monitoring | Admin list & details | Bookings exist | GET `/admin/bookings`, `/admin/bookings/:id` | City only; no street, customer or provider phone | As expected — E2E:integration; WEB-UI | Pass |

## Admin

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| ADM-TC-01 | Admin | FR8 dashboard | Live counts | Data exists | GET `/admin/dashboard`; change data | Real counts; update after changes | As expected — E2E:admin; WEB-UI | Pass |
| ADM-TC-02 | Admin | Verification details | Full application | Pending provider | GET `/admin/providers/:id` | Contact, trade, district, services, prices, visit fee, checks, readiness | As expected — E2E:admin, E2E:integration; WEB-UI | Pass |
| ADM-TC-03 | Admin | Approval/rejection confirmation screens | Confirmation pages | Pending provider | Open approve and reject confirmation | Render with provider name and actions | As expected — WEB-UI | Pass |
| ADM-TC-04 | Admin | User list / search / filters | Users | Users of each role | GET `/admin/users` with role/status/search | Filtered results; counts per role & suspended | As expected — E2E:admin | Pass |
| ADM-TC-05 | Admin | User details | Activity counts | User with bookings | GET `/admin/users/:id` | Booking & complaint counts, `canChangeStatus` | As expected — E2E:admin | Pass |
| ADM-TC-06 | Admin | Suspend / reactivate | Suspend customer | Customer | PATCH status false, login, use token; then true | Login 403, token 401; restored on reactivation | As expected — E2E:admin, E2E:integration | Pass |
| ADM-TC-07 | Admin | Protected admin accounts | Suspend self / other admin | Admin | PATCH status on own id / another admin | 400 | As expected — E2E:admin | Pass |
| ADM-TC-08 | Admin | Booking monitoring | List, filter, search, details | Bookings in all statuses | GET with status/search; details | Real data; status counts; timeline with actor name/role | As expected — E2E:admin, E2E:integration; WEB-UI | Pass |
| ADM-TC-09 | Admin | Monitoring is read-only | Attempt mutation | Booking | PATCH `/admin/bookings/:id`, `/admin/bookings/:id/status` | 404 (no route) | As expected — E2E:integration, E2E:admin | Pass |
| ADM-TC-10 | Admin | Customer redirected from admin UI | Customer opens `/admin/dashboard` | Customer session | Navigate | Redirected to customer home | As expected — WEB-UI | Pass |

## Complaint Management

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| CMP-TC-01 | Complaints | Create | Customer files complaint | Own booking | POST `/complaints` | 201, `open`, reference `CP-XXXXXX` | As expected — E2E:admin, E2E:integration | Pass |
| CMP-TC-02 | Complaints | Ownership | Another customer's / missing booking | Two customers | POST with other's booking id; random id | 404 | As expected — E2E:integration, E2E:admin | Pass |
| CMP-TC-03 | Complaints | Validation | Long text / unknown fields | Own booking | Description 1001 chars; extra `status` field; 1000 chars | 400, 400, 201 | As expected — E2E:integration | Pass |
| CMP-TC-04 | Complaints | Start review | open → in_review | Open complaint | PATCH status `in_review` | 200; history updated | As expected — E2E:admin | Pass |
| CMP-TC-05 | Complaints | Resolve needs note | Resolve without / short note | Open or in review | PATCH resolved without note, with "ok" | 400 | As expected — E2E:integration, E2E:admin | Pass |
| CMP-TC-06 | Complaints | Resolve & persist | open → resolved (direct) | Open complaint | PATCH resolved + note; re-read | `resolved`, note stored, `allowedTransitions: []` | As expected — E2E:integration, E2E:admin | Pass |
| CMP-TC-07 | Complaints | Final state | Change a resolved complaint | Resolved | PATCH `in_review` / `open` | 409 | As expected — E2E:integration, E2E:admin | Pass |

## Edge cases

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| EDGE-TC-01 | General | Invalid id | Malformed ObjectId | Token | GET `/providers/not-an-id`, `/admin/users/xyz` | 400 | As expected — E2E:integration | Pass |
| EDGE-TC-02 | General | Nonexistent records | Random valid ids | Tokens | Booking, provider booking, accept, admin booking, complaint | 404 | As expected — E2E:integration | Pass |
| EDGE-TC-03 | General | Malformed payload | Bad slot, impossible date, form body, extra field | Customer | POST `/bookings` | 400 | As expected — E2E:integration | Pass |
| EDGE-TC-04 | General | Long names | 100 / 101 character names | None | Register | 201 / 400; 100-char names wrap on all screens | As expected — E2E:integration; WEB-UI | Pass |
| EDGE-TC-05 | General | Large prices | Rs 1,000,000 service, Rs 10,000 visit fee | Provider | Save, approve, book, view on all screens | Accepted; totals (Rs 1,010,000) readable | As expected after fix DEF-02 — WEB-UI | Pass |
| EDGE-TC-06 | General | Empty states | No requests / no complaints in filter | Fresh provider; filter `in_review` | Open Requests; GET complaints | Empty list and empty-state UI | As expected — E2E:integration; WEB-UI | Pass |
| EDGE-TC-07 | General | Backend unavailable | API stopped | Web app loaded | Try sign-in; open Admin Login | "Unable to reach the server…"; Admin Login shows "Server Offline" | As expected — WEB-UI. Stored sessions fall back to login screen (see limitations) | Pass |
| EDGE-TC-08 | General | Nonexistent booking UI | Track a random id | Customer | Open Track Booking with random id | "Couldn't load this booking" state | As expected — WEB-UI | Pass |

## Responsive UI (mobile web)

| Test ID | Module | Requirement | Test Scenario | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|
| UI-TC-01 | UI | Usability/responsive | Auth screens | None | Open 5 login/sign-up screens at 412×915 and 360×780 | No horizontal overflow, no off-screen elements | 10/10 renders clean — WEB-UI | Pass |
| UI-TC-02 | UI | Responsive | Customer screens incl. stress data | Seeded + stress data | Home, list (3 variants), details, book, modify, confirmation, track (4 states) at both sizes | Readable, no overflow, sticky CTA reachable | 24/24 clean — WEB-UI | Pass |
| UI-TC-03 | UI | Responsive | Provider screens (verified + pending) | Stress provider | Dashboard, requests, details, schedule, location (locked/unlocked), availability at both sizes | No overflow; tab bar intact | 22/22 clean — WEB-UI | Pass |
| UI-TC-04 | UI | Responsive | Admin screens | Stress data | 12 Admin screens at both sizes | No overflow; Figma layout preserved | 24/24 clean after DEF-02 — WEB-UI | Pass |
| UI-TC-05 | UI | Large values | Booking Monitor KPI with ≥ Rs 1M active value | Stress bookings | Open Booking Monitor | Value readable | Was "Rs. 3…" (DEF-02); now "Rs. 3M" — WEB-UI | Pass |
| UI-TC-06 | UI | End-to-end click-through | Full lifecycle by tapping real buttons | Stress data | 16 scripted UI checks at each viewport | All pass | 16/16 at 360×780, 16/16 at 412×915 — WEB-UI | Pass |
| UI-TC-07 | UI | Error/empty/loading states | Error & empty screens | API stopped / no data | See EDGE-TC-06..08 | Clear messages | As expected — WEB-UI | Pass |
| UI-TC-08 | UI | Native Android UI | Run on device/emulator | Android device | Run app on Android | Same results as web | **Not executed** — the Android emulator was unstable; Android bundle export only proves the bundle builds | Not Run |
