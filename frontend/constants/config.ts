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

  // Live cloud backend URL fallback for standalone APK builds
  return 'https://fix-clean-mobile-app.onrender.com';
}

export const config = {
  apiBaseUrl: resolveApiBaseUrl(),
};
