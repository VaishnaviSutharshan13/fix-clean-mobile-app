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
yarn expo-doctor             # diagnose dependency/config issues
```
