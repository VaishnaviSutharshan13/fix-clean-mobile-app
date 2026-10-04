import { Redirect } from 'expo-router';

import Loading from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { getHomeRouteForRole } from '../utils/helpers';

// Entry point: signed-in users go to their role's home, everyone else to the
// Customer Login screen (the prototype's starting screen).
export default function Index() {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) return <Loading />;
  if (isAuthenticated && role) return <Redirect href={getHomeRouteForRole(role)} />;
  return <Redirect href="/auth/customer-login" />;
}
