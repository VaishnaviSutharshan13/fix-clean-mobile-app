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
