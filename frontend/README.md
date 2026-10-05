# FIX & CLEAN CO. — Mobile App (Expo)

React Native + Expo (TypeScript) client using Expo Router for navigation.

## Setup

```bash
cd frontend
yarn install
cp .env.example .env   # then fill in values
yarn start
```

## Route groups

- `app/auth/` — login / sign-up for customers, providers and admins
- `app/customer/` — customer screens
- `app/provider/` — service provider screens
- `app/admin/` — administrator screens

## Useful commands

```bash
yarn expo install <package>  # install SDK-compatible packages
yarn typecheck               # TypeScript check
yarn test                    # unit tests (pure TypeScript logic in utils/)
yarn expo-doctor             # diagnose dependency/config issues
```

## Admin design

The Admin screens follow the Admin Figma prototype (file `p1bUwfoxID2H7FONcoHbSQ`,
frames 1:1360 Login, 1:1519 Dashboard, 1:1773 Provider Verifications, 1:2050 Verification
Detail Review, 1:2209 User Management, 1:2430 Booking Monitor). Design tokens are in
`constants/adminTheme.ts`; the Plus Jakarta Sans, Inter and Roboto Mono fonts come from
`@expo-google-fonts/*` and load without blocking the app (`hooks/useAdminFonts.ts`).

## Reaching the backend

The app calls the NestJS API at `EXPO_PUBLIC_API_BASE_URL`. When it is empty,
development builds use the IP of the computer running Expo/Metro with port
3000, which works for phones on the same Wi-Fi.

- **Android emulator:** `10.0.2.2` always points to the host computer, even if
  its Wi-Fi address changes:
  `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000 yarn android`
- **Physical phone:** leave it empty, or use the computer's current LAN IP
  (e.g. `http://192.168.1.10:3000`). Restart Expo after changing networks.

Demo accounts and the status-simulation tool are documented in
`backend/README.md`.

## Testing status

- Unit tests: `yarn test` (pure logic in `utils/`).
- The Customer and Provider screens have been tested in the Expo **web** app at mobile
  viewport sizes (412×915 and 360×780), including the live Customer ↔ Provider flow.
- **Android Provider UI testing has not been completed yet** because the Android emulator
  on the development machine was unstable; responsive mobile web testing was used instead.
- The Admin screens (Admin Login, Dashboard, Verification Requests / Details, Approval /
  Rejection Confirmation, User Management, Booking Monitoring, Complaints / Disputes) were
  tested in the Expo **web** app at 412×915 and 360×780, including the three-role
  Provider → Admin → Customer flow. **Android Admin UI testing has not been completed**
  for the same reason.
- The provider lifecycle (sign up → pending → services & rates → admin verification →
  bookable) is documented in `backend/README.md`.
