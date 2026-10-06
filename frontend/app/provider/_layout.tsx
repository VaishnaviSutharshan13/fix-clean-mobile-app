import { Redirect, Stack } from 'expo-router';

import Loading from '../../components/Loading';
import { useAuth } from '../../hooks/useAuth';
import { getHomeRouteForRole } from '../../utils/helpers';
import { AccountSheetHost } from '../../components/AccountSheet';

// Only signed-in users with the "provider" role may enter this route group.
export default function ProviderLayout() {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) return <Loading />;
  // Signed out (e.g. after Sign out) → back to the Provider Login screen.
  if (!isAuthenticated || !role) return <Redirect href="/auth/customer-login" />;
  if (role !== 'provider') return <Redirect href={getHomeRouteForRole(role)} />;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <AccountSheetHost />
    </>
  );
}
