# Requirements Traceability Matrix

Branch: `feature/testing-aruldino` · Final integration pass, 5 Oct 2026.
Test case IDs refer to [FUNCTIONAL_TEST_CASES.md](FUNCTIONAL_TEST_CASES.md). Statuses use
**Fully satisfied**, **Partially satisfied** or **Not satisfied**, based only on evidence
produced in this pass.

## Functional requirements

| Req | Requirement | Implementation area | Test case IDs | Evidence | Status | Limitation |
|---|---|---|---|---|---|---|
| FR1 | Customer sees provider ratings and reviews | `backend/src/reviews/*`; rating, review count and jobs done computed live in `providers.service.ts` (`statsStages`); `customer/provider-details.tsx`, `ProviderCard`, `Rating` | CUS-TC-01, CUS-TC-05 | E2E:customer (computed ratings, `/reviews`), WEB-UI | Fully satisfied | Customers can read reviews but there is no screen or API for submitting one. Existing reviews come from seed data. |
| FR2 | Provider verification status | `ProviderProfile.verificationStatus`; `CUSTOMER_VISIBLE` filter; `VerificationBanner`; `VerifiedBadge` | PRO-TC-01, PRO-TC-02, VER-TC-01, VER-TC-05, VER-TC-06, VER-TC-08 | E2E:integration, E2E:admin, E2E:provider, WEB-UI | Fully satisfied | — |
| FR3 | Booking status tracking and notifications | `booking-status.ts` lifecycle; `customer/track-booking.tsx`; `useBookingStatusNotice`; `StatusChangeBanner`; 15 s focus polling | CUS-TC-12, CUS-TC-13, CUS-TC-14, BOOK-TC-01…04, BOOK-TC-09 | E2E:integration; UNIT-FE (bookingProgress); WEB-UI live banner for all 4 transitions | Fully satisfied | In-app notification only, delivered by polling (up to ~15 s). There are no push notifications and no live GPS (by design). |
| FR4 | Provider receives, accepts and declines bookings | `provider-bookings.controller/service.ts`; `provider/booking-requests`, `booking-details`, `confirm-booking`, `customer-location` | PRO-TC-08…12, BOOK-TC-01, BOOK-TC-04…08 | E2E:provider, E2E:integration, WEB-UI click-through (both viewports) | Fully satisfied | — |
| FR5 | Provider availability | `providers/availability.ts`; `PUT /provider/availability`; checked server-side in `bookings.service.ts`; `provider/availability.tsx` | PRO-TC-06, AVL-TC-01…05 | E2E:integration, E2E:provider | Fully satisfied | Rescheduling to a provider who is no longer bookable was fixed in this pass (DEF-01). |
| FR6 | Customer location shown only after confirmation | `toProviderView` (`CONTACT_SHARED_STATUSES`); `provider/customer-location.tsx` lock screen; admin views return the city only | PRIV-TC-01…05 | E2E:integration (whole-JSON checks), E2E:provider, WEB-UI | Fully satisfied | — |
| FR7 | Admin reviews and approves provider verification | `admin-verification.service.ts`; `provider-readiness.ts`; `admin/verification-requests`, `verification-details`, `approval-confirmation` | VER-TC-02…07, ADM-TC-02, ADM-TC-03, SEC-TC-07 | E2E:admin, E2E:integration, UNIT-BE (provider-readiness), WEB-UI | Fully satisfied | Identity, contact and experience checks are manual confirmations by the admin. No documents are collected. |
| FR8 | Admin dashboard, user management, verification, complaints, booking monitoring | `backend/src/admin/*`; `backend/src/complaints/*`; `frontend/app/admin/*` | ADM-TC-01…10, CMP-TC-01…07, VER-TC-02…07 | E2E:admin, E2E:integration, UNIT-FE (admin utils), WEB-UI | Fully satisfied | Booking monitoring is read-only by design. Customers can file complaints through the API only; there is no customer complaint screen. |

## Non-functional requirements

| Req | Requirement | Implementation area | Test case IDs | Evidence | Status | Limitation |
|---|---|---|---|---|---|---|
| NFR – Timely updates | Status changes reach the customer promptly | 15 s focus polling on Track Booking, provider and admin screens | CUS-TC-13 | One observed run: banners appeared 12–15 s after each provider action | Partially satisfied | Based on polling, not push. No formal response-time measurement was taken. |
| NFR – Security | Authentication, role-based access, safe data handling | JWT (`JwtStrategy` reloads the user on each request); `RolesGuard`; bcrypt (12 rounds); global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`); explicit response mapping | AUTH-TC-*, SEC-TC-01…10, ADM-TC-06, ADM-TC-07 | E2E:auth, E2E:admin, E2E:integration | Fully satisfied | No login rate limiting. The web build stores the token in `localStorage` (native builds use SecureStore). |
| NFR – Usability / responsiveness | Usable on small mobile screens | Mobile-first layouts; Figma-derived screens | UI-TC-01…07 | 80 screen renders (40 per viewport) and 2 × 16 click-through checks at 412×915 and 360×780 | Partially satisfied | Responsive web only. No Android device testing (UI-TC-08 Not Run). No usability sessions with real participants have been run yet (plan prepared). |
| NFR – Availability / reliability | Graceful behaviour on failures | `ApiError` messages; Admin Login server probe; atomic status updates (guarded `findOneAndUpdate`) | EDGE-TC-07, BOOK-TC-05, BOOK-TC-06 | WEB-UI with the API stopped; E2E double-action tests | Partially satisfied | No deployment, uptime or load testing. With a stored session, the app shows the login screen while the API is unreachable (OBS-03). |
| NFR5 – Location privacy | Exact address and phone shared only when needed | Same as FR6; no live GPS anywhere | PRIV-TC-01…05, CUS-TC-14 | E2E:integration, WEB-UI | Fully satisfied | — |
