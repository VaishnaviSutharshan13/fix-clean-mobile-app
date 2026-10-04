import { Redirect, Stack } from 'expo-router';

import Loading from '../../components/Loading';
import { useAuth } from '../../hooks/useAuth';
import { getHomeRouteForRole } from '../../utils/helpers';

// Only signed-in users with the "customer" role may enter this route group.
export default function CustomerLayout() {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated || !role) return <Redirect href="/" />;
  if (role !== 'customer') return <Redirect href={getHomeRouteForRole(role)} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
