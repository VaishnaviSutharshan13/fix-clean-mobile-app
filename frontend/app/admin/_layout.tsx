import { Redirect, Stack } from 'expo-router';

import Loading from '../../components/Loading';
import { useAuth } from '../../hooks/useAuth';
import { getHomeRouteForRole } from '../../utils/helpers';

// Only signed-in users with the "admin" role may enter this route group.
// The server enforces the same rule on every /admin API call.
export default function AdminLayout() {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) return <Loading />;
  // Signed out (e.g. after Sign out) → back to the shared Login screen.
  if (!isAuthenticated || !role) return <Redirect href="/auth/customer-login" />;
  if (role !== 'admin') return <Redirect href={getHomeRouteForRole(role)} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
