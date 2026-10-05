import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '../context/AuthContext';
import { useAdminFonts } from '../hooks/useAdminFonts';

export default function RootLayout() {
  // Admin screen fonts (Figma); non-blocking.
  useAdminFonts();

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="customer" />
        <Stack.Screen name="provider" />
        <Stack.Screen name="admin" />
      </Stack>
    </AuthProvider>
  );
}
