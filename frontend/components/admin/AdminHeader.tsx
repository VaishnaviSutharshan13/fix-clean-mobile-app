import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ac, af, ar } from '../../constants/adminTheme';
import { useAuth } from '../../hooks/useAuth';
import { confirmAction } from '../../utils/display';
import { getInitials } from '../../utils/helpers';

type Props = {
  // Root screens (Figma 1:1519, 1:1773, 1:2209, 1:2430): brand + breadcrumb.
  section?: string;
  // Detail screens (Figma 1:2050): back arrow + title + session chip.
  title?: string;
  showBack?: boolean;
  // Orange dot on the bell (items need attention). The bell opens the queue.
  alert?: boolean;
};

// Admin top bar from the Admin Figma frames.
export default function AdminHeader({ section, title, showBack, alert }: Props) {
  const { user, logout } = useAuth();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/admin/dashboard'));

  const openAccount = async () => {
    const ok = await confirmAction(
      user?.name ?? 'Administrator',
      `Signed in as ${user?.email ?? ''}.\n\nDo you want to sign out?`,
      'Sign out',
    );
    if (ok) await logout();
  };

  const avatar = (
    <Pressable onPress={openAccount} accessibilityRole="button" accessibilityLabel="Account and sign out" hitSlop={6}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(user?.name ?? 'Admin')}</Text>
      </View>
    </Pressable>
  );

  if (showBack) {
    return (
      <View style={styles.bar}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={ac.text} />
        </Pressable>
        <Text style={styles.detailTitle} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.sessionChip}>
          <Text style={styles.sessionText}>Admin{'\n'}Session</Text>
        </View>
        {avatar}
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>F</Text>
      </View>
      <View style={styles.brand}>
        <View style={styles.brandRow}>
          <Text style={styles.brandName} numberOfLines={1}>
            FIX &amp; CLEAN
          </Text>
          <View style={styles.adminTag}>
            <Text style={styles.adminTagText}>ADMIN</Text>
          </View>
        </View>
        <View style={styles.crumbRow}>
          <View style={styles.crumbDot} />
          <Text style={styles.crumb} numberOfLines={2} accessibilityRole="header">
            Admin Console • {section}
          </Text>
        </View>
      </View>
      <Pressable
        style={styles.bell}
        onPress={() => router.navigate('/admin/verification-requests')}
        accessibilityRole="button"
        accessibilityLabel={alert ? 'Verification queue, items need attention' : 'Verification queue'}
      >
        <Ionicons name="notifications-outline" size={22} color={ac.text} />
        {alert ? <View style={styles.bellDot} /> : null}
      </Pressable>
      {avatar}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: ac.surface,
    shadowColor: '#131B2E',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 2,
  },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: ac.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: af.heading, fontSize: 18, color: ac.onPrimary },
  brand: { flex: 1, minWidth: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandName: { fontFamily: af.heading, fontSize: 18, color: ac.text, letterSpacing: -0.5, flexShrink: 1 },
  adminTag: { backgroundColor: ac.containerHigh, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  adminTagText: { fontFamily: af.bold, fontSize: 11, color: ac.primary, letterSpacing: 0.4 },
  crumbRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  crumbDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ac.success },
  crumb: { flex: 1, fontFamily: af.medium, fontSize: 12, color: ac.textMuted },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ac.containerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ac.dotOrange,
  },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: ac.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: af.bold, fontSize: 13, color: ac.onPrimary },
  detailTitle: { flex: 1, minWidth: 0, fontFamily: af.heading, fontSize: 18, color: ac.text, letterSpacing: -0.3 },
  sessionChip: { backgroundColor: ac.containerHigh, borderRadius: ar.sm, paddingHorizontal: 6, paddingVertical: 2 },
  sessionText: { fontFamily: af.semibold, fontSize: 10, lineHeight: 12, color: ac.primary, textAlign: 'center' },
});
