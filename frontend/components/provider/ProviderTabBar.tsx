import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { confirmAction } from '../../utils/display';

type TabKey = 'dashboard' | 'requests' | 'schedule';

const TABS: { key: TabKey; label: string; icon: ComponentProps<typeof Ionicons>['name']; href: Href }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', href: '/provider/dashboard' },
  { key: 'requests', label: 'Requests', icon: 'document-text-outline', href: '/provider/booking-requests' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline', href: '/provider/availability' },
];

// Bottom navigation from the Provider prototype: Dashboard, Requests,
// Schedule (Manage Availability) and Profile (account / sign out).
export default function ProviderTabBar({ active, requestCount = 0 }: { active: TabKey; requestCount?: number }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const openProfile = async () => {
    const ok = await confirmAction(
      user?.name ?? 'Profile',
      `Signed in as ${user?.email ?? ''}.\n\nDo you want to sign out?`,
      'Sign out',
    );
    if (ok) await logout();
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => !selected && router.replace(tab.href)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              tab.key === 'requests' && requestCount > 0 ? `${tab.label}, ${requestCount} pending` : tab.label
            }
          >
            <View>
              <Ionicons name={tab.icon} size={24} color={selected ? colors.primary : colors.textMuted} />
              {tab.key === 'requests' && requestCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{requestCount > 9 ? '9+' : requestCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
      <Pressable style={styles.tab} onPress={openProfile} accessibilityRole="tab" accessibilityLabel="Profile and sign out">
        <Ionicons name="id-card-outline" size={24} color={colors.textMuted} />
        <Text style={styles.label}>Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48, justifyContent: 'center' },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  labelActive: { color: colors.primary, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.white },
});
