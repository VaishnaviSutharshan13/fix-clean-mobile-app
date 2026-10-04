// App-wide configuration. Values come from EXPO_PUBLIC_* environment variables.
export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
};
