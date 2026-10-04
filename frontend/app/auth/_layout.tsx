import { Redirect, Stack } from 'expo-router';

import Loading from '../../components/Loading';
import { useAuth } from '../../hooks/useAuth';
import { getHomeRouteForRole } from '../../utils/helpers';

// Signed-in users are sent to their role's home screen. This is what performs
// the role redirect right after a successful login or registration.
export default function AuthLayout() {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) return <Loading />;
  if (isAuthenticated && role) return <Redirect href={getHomeRouteForRole(role)} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
