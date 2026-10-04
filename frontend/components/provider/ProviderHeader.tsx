import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { confirmAction } from '../../utils/display';

type Props = {
  title: string;
  // Shows a back arrow (detail screens). Root tabs show none.
  showBack?: boolean;
  // Orange dot on the bell when there are pending requests.
  hasAlerts?: boolean;
};

// Provider top bar (Figma): back arrow, left-aligned title, bell, avatar.
export default function ProviderHeader({ title, showBack, hasAlerts }: Props) {
  const { user, logout } = useAuth();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/provider/dashboard'));

  const openAccount = async () => {
    const ok = await confirmAction(
      user?.name ?? 'Account',
      `Signed in as ${user?.email ?? ''}.\n\nDo you want to sign out?`,
      'Sign out',
    );
    if (ok) await logout();
  };

  return (
    <View style={styles.bar}>
      {showBack ? (
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      ) : null}
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      <Pressable
        onPress={() => router.navigate('/provider/booking-requests')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={hasAlerts ? 'Booking requests, new requests waiting' : 'Booking requests'}
      >
        <Ionicons name="notifications-outline" size={23} color={colors.text} />
        {hasAlerts ? <View style={styles.dot} /> : null}
      </Pressable>
      <Pressable onPress={openAccount} accessibilityRole="button" accessibilityLabel="Account and sign out">
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={colors.white} />
        </View>
        <View style={styles.online} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  title: { flex: 1, fontSize: 19, fontWeight: '600', color: colors.text },
  dot: {
    position: 'absolute',
    top: 0,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  online: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
