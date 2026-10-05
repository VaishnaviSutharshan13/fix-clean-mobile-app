import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ac, af } from '../../constants/adminTheme';

// The Figma bottom navigation has four tabs. Complaints / Disputes live under
// Bookings ("Live Monitor And Complaints" in Figma frame 1:2430).
export type AdminTab = 'dashboard' | 'verify' | 'users' | 'bookings';

const TABS: { key: AdminTab; label: string; icon: ComponentProps<typeof Ionicons>['name']; href: Href }[] = [
  { key: 'dashboard', label: 'Home', icon: 'grid-outline', href: '/admin/dashboard' },
  { key: 'verify', label: 'Verify', icon: 'shield-checkmark-outline', href: '/admin/verification-requests' },
  { key: 'users', label: 'Users', icon: 'people-outline', href: '/admin/user-management' },
  { key: 'bookings', label: 'Bookings', icon: 'receipt-outline', href: '/admin/booking-monitoring' },
];

type Props = { active: AdminTab; badges?: Partial<Record<AdminTab, number>> };

export default function AdminTabBar({ active, badges = {} }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const selected = tab.key === active;
        const badge = badges[tab.key] ?? 0;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => router.replace(tab.href)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={badge > 0 ? `${tab.label}, ${badge} need attention` : tab.label}
          >
            <View>
              <Ionicons name={selected ? (tab.icon.replace('-outline', '') as typeof tab.icon) : tab.icon} size={24} color={selected ? ac.primary : ac.textMuted} />
              {badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: ac.card,
    paddingTop: 10,
    shadowColor: '#131B2E',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', gap: 3, minHeight: 50, justifyContent: 'center' },
  label: { fontFamily: af.medium, fontSize: 13, color: ac.textMuted },
  labelActive: { fontFamily: af.semibold, color: ac.primary },
  badge: {
    position: 'absolute',
    top: -6,
    right: -11,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: ac.dotOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: af.bold, fontSize: 11, color: ac.onPrimary },
});
