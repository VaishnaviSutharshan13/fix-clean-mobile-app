# Notification Management

**Aruldino:** Notification Management, System Integration and Testing

CRUD contribution:

- **READ:** retrieve the authenticated user's notifications.
- **UPDATE:** update a notification's read/unread state.

The Customer booking CRUD, Provider CRUD and Administrator CRUD were built by the
other team members and are not part of this contribution. This feature only adds
a notification after their existing actions succeed.

## Before this feature

Booking status notices were client-side only. Track Booking polled the booking and
showed `StatusChangeBanner` when the status changed while the screen was open.
Nothing was stored, so a change made while the app was closed was never shown, and
there was no read/unread state.

## Backend (`backend/src/notifications/`)

New `notifications` MongoDB collection:

| Field | Notes |
| --- | --- |
| `recipient` | User id (customer, provider or admin). Required. |
| `type` | `booking_requested`, `booking_confirmed`, `booking_declined`, `booking_on_the_way`, `booking_completed`, `booking_cancelled`, `provider_verified`, `provider_rejected` |
| `title`, `message` | Text built from real booking/provider data |
| `booking`, `bookingReference` | Optional, for booking notifications |
| `read`, `readAt` | Read state |
| `createdAt`, `updatedAt` | Timestamps |

Indexes: `{ recipient, createdAt: -1 }` and `{ recipient, read }`.

### Endpoints (all require a JWT, any role)

| Method | Path | Result |
| --- | --- | --- |
| GET | `/notifications/me?bookingId=<optional>` | `{ items, unreadCount }`. Returns the caller's own notifications, newest first, at most 50. `unreadCount` counts all of the caller's unread notifications. |
| PATCH | `/notifications/:id/read` | Marks the notification as read and returns it. |
| PATCH | `/notifications/:id/unread` | Marks the notification as unread and returns it. |

Security:

- The user always comes from the JWT. A client-supplied user id is rejected with 400 (`forbidNonWhitelisted`).
- Every query and update filters on `recipient`, so another user's notification returns 404, just like an id that doesn't exist.
- A malformed id returns 400.

### Events that create notifications

| Existing action (owner module) | Recipient | Type |
| --- | --- | --- |
| Customer creates a booking (Customer) | Provider | `booking_requested` |
| Customer cancels a booking (Customer) | Provider | `booking_cancelled` |
| Provider accepts / declines / on the way / completes (Provider) | Customer | `booking_confirmed` / `booking_declined` / `booking_on_the_way` / `booking_completed` |
| Admin approves / rejects a provider (Admin) | Provider | `provider_verified` / `provider_rejected` (includes the reason) |

Each one is a single `await notifications.notify…()` call placed after the existing
save succeeds. `NotificationsService` catches and logs its own errors, so if a
notification fails the booking or verification change still succeeds. An e2e test
covers this.

The developer CLI `yarn dev:booking-status` writes to the database directly and
does not create notifications.

## Frontend (no new screen)

Reuses **Customer → Track Booking** and its existing `StatusChangeBanner`:

- **READ:** the screen loads `GET /notifications/me?bookingId=…` when it opens, every 15 s and on pull-to-refresh. The banner shows the newest unread booking notification, so a change made while the app was closed still appears.
- **UPDATE:** dismissing the banner (✕) hides it straight away and calls `PATCH /notifications/:id/read` for that booking's unread notifications.
- If no stored notification is available, the original polling-based notice still appears as before.

Provider and Admin screens are unchanged. Their bell dots still show pending requests and the verification queue. Providers can read their notifications through the API, but no provider or admin screen displays them yet.

## Tests

- `backend/src/notifications/notification-messages.spec.ts`: unit tests for the message text.
- `backend/test/notifications.e2e-spec.ts`: 17 tests covering READ, UPDATE, 401/404/400 responses, ownership, database state, every creation event, and a failed notification not breaking the booking action.
- `frontend/utils/__tests__/notifications.test.ts`: unit tests for the banner mapping.
