import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cc, cf } from '../../constants/customerTheme';
import { useAccountPrompt } from './CustomerHeader';
import type { IoniconName } from './CustomerPrimitives';

export type CustomerTab = 'explore' | 'bookings' | 'account';

type Props = {
  active: CustomerTab;
  onBookings?: () => void;
};

// Bottom navigation from the Home / Provider List references. Only tabs that
// lead somewhere real: Explore (Home), Bookings ("My bookings" on Home) and
// Account (sign-out prompt). There is no in-app messaging, so no Messages tab.
export default function CustomerBottomNav({ active, onBookings }: Props) {
  const openAccount = useAccountPrompt();

  const tabs: { key: CustomerTab; label: string; icon: IoniconName; activeIcon: IoniconName; onPress: () => void }[] = [
    {
      key: 'explore',
      label: 'Explore',
      icon: 'compass-outline',
      activeIcon: 'compass',
      onPress: () => router.navigate('/customer/home'),
    },
    {
      key: 'bookings',
      label: 'Bookings',
      icon: 'calendar-outline',
      activeIcon: 'calendar',
      onPress: onBookings ?? (() => router.navigate({ pathname: '/customer/home', params: { section: 'bookings' } })),
    },
    {
      key: 'account',
      label: 'Account',
      icon: 'person-outline',
      activeIcon: 'person',
      onPress: openAccount,
    },
  ];

  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={tab.onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.key === 'account' ? 'Account and sign out' : tab.label}
          >
            <Ionicons name={selected ? tab.activeIcon : tab.icon} size={23} color={selected ? cc.primary : cc.text} />
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: cc.bg,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: cc.outlineSoft,
    shadowColor: cc.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 52 },
  label: { fontFamily: cf.semibold, fontSize: 12, color: cc.text },
  labelActive: { color: cc.primary },
});
