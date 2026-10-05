import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ac } from '../../constants/adminTheme';
import AdminHeader from './AdminHeader';
import AdminTabBar, { type AdminTab } from './AdminTabBar';

type Props = {
  // Breadcrumb for root screens ("Admin Console • …"); title for detail screens.
  section?: string;
  title?: string;
  children: ReactNode;
  // Root tabs show the tab bar; detail screens show the back header instead.
  tab?: AdminTab;
  badges?: Partial<Record<AdminTab, number>>;
  alert?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
};

// Page frame shared by every Admin screen (Admin Figma layout).
export default function AdminShell({ section, title, children, tab, badges, alert, refreshing, onRefresh, footer }: Props) {
  const detail = !tab;
  return (
    <SafeAreaView style={styles.safe} edges={detail ? ['top', 'bottom'] : ['top']}>
      <AdminHeader section={section ?? title} title={title} showBack={detail} alert={alert} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
      {tab ? <AdminTabBar active={tab} badges={badges} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ac.surface },
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 28, flexGrow: 1 },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: ac.card,
    shadowColor: '#131B2E',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
});
