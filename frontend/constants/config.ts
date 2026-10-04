import Constants from 'expo-constants';

const API_PORT = 3000;

// EXPO_PUBLIC_API_BASE_URL wins when set. Otherwise, in development, reuse the
// IP of the machine running Metro so physical devices and emulators can reach
// the local NestJS backend without extra setup.
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (devHost) {
    return `http://${devHost}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

export const config = {
  apiBaseUrl: resolveApiBaseUrl(),
};
