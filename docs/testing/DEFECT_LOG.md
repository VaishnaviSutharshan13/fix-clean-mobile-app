# Defect Log — Final Integration Pass

Branch: `feature/testing-aruldino` · 5 Oct 2026 · Aruldino T

Only defects reproduced during the final pass are listed. Each one was reproduced before
it was fixed and retested afterwards. Earlier milestone defects are not listed here
because no defect log or evidence for them exists in the repository.

| Defect ID | Module | Description | Severity | Steps to Reproduce | Expected | Actual | Fix | Retest Result |
|---|---|---|---|---|---|---|---|---|
| DEF-01 | Customer / Booking (backend) | Rescheduling a *requested* booking skipped the provider check when the provider was no longer bookable (e.g. suspended by an admin). The new date/window was saved without any availability check. Changing the *service* in the same situation was already refused, so the two paths were inconsistent. | Medium | 1. Customer books a verified provider (status `requested`). 2. Admin suspends the provider. 3. Customer sends `PATCH /bookings/me/:id` with a new `scheduledDate` / `timeSlot` (any window, including one the provider never works). | 404 "This provider is no longer available", same as changing the service | 200, booking rescheduled | `backend/src/bookings/bookings.service.ts` (`updateForCustomer`): throw `NotFoundException('This provider is no longer available')` when the provider profile is not bookable, then always check availability. Regression test in `backend/test/integration.e2e-spec.ts` ("suspended provider: …"). | Before the fix the new test failed (`expected 404, got 200`). After the fix: integration spec 31/31, full e2e suite 163/163 passed. |
| DEF-02 | Admin / Booking Monitoring (frontend) | The "Active value" KPI tile only had a thousands ("k") step. With valid large prices (services up to Rs 1,000,000) the value became e.g. "Rs. 3040k". `adjustsFontSizeToFit` is not supported on react-native-web, so the tile showed an unreadable "Rs. 3…" / "Rs. 304…". | Low | 1. A verified provider has a Rs 1,000,000 service. 2. Customer creates 3 bookings; they become active. 3. Admin opens Booking Monitor at 360×780 or 412×915. | Value readable within the tile | "Rs. 3…" at 360×780; "Rs. 304…" at 412×915 | Added `formatLKRCompact` to `frontend/utils/money.ts` (adds an "M" step, e.g. "Rs. 3M", "Rs. 3.3M") and used it in `frontend/app/admin/booking-monitoring.tsx`. Tile size, fonts and layout are unchanged (Figma layout preserved). Unit test added in `frontend/utils/__tests__/formatting.test.ts`. | Tile shows "Rs. 3M" at both viewports. Frontend tests 49/49, typecheck passed, all 80 responsive renders clean. |
| DEF-03 | Backend (maintenance) | `findOneAndUpdate(..., { new: true })` is deprecated in the installed Mongoose 9. Every e2e run printed deprecation warnings. Behaviour was still correct. | Low | Run `yarn test:e2e` | No warnings | 17 `[MONGOOSE] Warning: … the new option … is deprecated` lines across 3 processes | Replaced with the documented equivalent `{ returnDocument: 'after' }` in `providers.service.ts` and `provider-bookings.service.ts`, and in two test fixtures (`customer.e2e-spec.ts`, `provider.e2e-spec.ts`). | 163/163 e2e passed, 0 Mongoose warnings. |
| DEF-04 | Documentation | The root `README.md` contained personal `git config` commands (a contributor's name and an email placeholder) instead of project setup, demo or test instructions. | Low | Open `README.md` | Accurate setup / demo / test guide | Stale git configuration notes | Rewrote `README.md` with prerequisites, setup, seed, run, demo accounts, workflows and test commands, and links to the module READMEs and `docs/testing/`. No secrets included. | Reviewed manually against the commands that were run during this pass. |

## Observations (not changed)

These were seen during testing but were judged out of scope or by design. They are recorded
so they can be decided on later.

| Ref | Area | Observation | Why not changed |
|---|---|---|---|
| OBS-01 | Admin Booking Details (360×780) | Very long provider names made of 10+ character words (100-character stress name) break mid-word in the narrow customer/provider column. Text stays readable and nothing overflows. | Only occurs with artificial 100-character names; changing it would alter the Figma two-column layout. |
| OBS-02 | Admin Booking Monitor (360×780) | The KPI label "Active value" is ellipsized to "Active v…" at 360 px. | Existing design (`numberOfLines={1}`); the value itself is readable after DEF-02. |
| OBS-03 | Session restore while backend is down | With a stored session and the API unreachable at app start, the token is kept but the app shows the login screen. Reloading once the API is back restores the session. | Matches the documented behaviour in `AuthContext` (token kept on network errors); no data loss. |
| OBS-04 | Booking | The same provider can receive several requests for the same date and window; the provider decides by accepting or declining. | Not a stated requirement; changing it would be a new feature. |
| OBS-05 | Complaints | "One unresolved complaint per booking" is enforced by a check before insert, not by a unique index, so two simultaneous submissions could both succeed. | Very unlikely in practice; there is no customer complaint UI yet. |
