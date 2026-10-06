import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cc, cf, cr } from '../constants/customerTheme';
import type { Booking } from '../types/booking';
import { getArrivalInfo, type ArrivalKind } from '../utils/bookingProgress';

const ICONS: Record<ArrivalKind, ComponentProps<typeof Ionicons>['name']> = {
  requested: 'hourglass-outline',
  expected: 'flash',
  en_route: 'navigate',
  completed: 'checkmark-done',
};

// Dispatch / arrival information (Confirmation "Instant Dispatch" well and
// Track Booking). Uses the scheduled arrival window and status history only —
// never a fake live ETA.
export default function ArrivalCard({ booking }: { booking: Booking }) {
  const info = getArrivalInfo(booking);
  if (!info) return null;

  const live = info.kind === 'expected' || info.kind === 'en_route' || info.kind === 'completed';
  return (
    <View style={styles.card} accessible accessibilityLabel={`${info.title}: ${info.value}. ${info.detail}`} testID="arrival-card">
      <View style={[styles.icon, live ? styles.iconLive : styles.iconWaiting]}>
        <Ionicons name={ICONS[info.kind]} size={22} color={live ? cc.onSuccessBright : cc.amber} />
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !live && styles.titleWaiting]}>{info.title.toUpperCase()}</Text>
          <View style={[styles.dot, !live && styles.dotWaiting]} />
        </View>
        <Text style={styles.value}>{info.value}</Text>
        <Text style={styles.detail}>{info.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: cr.lg,
    backgroundColor: cc.containerLow,
    borderWidth: 1,
    borderColor: cc.outlineSoft,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconLive: { backgroundColor: cc.successBright },
  iconWaiting: { backgroundColor: cc.amberSoft },
  text: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: cf.semibold, fontSize: 12, color: cc.success, letterSpacing: 0.8 },
  titleWaiting: { color: cc.amber },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: cc.success },
  dotWaiting: { backgroundColor: cc.amberBright },
  value: { fontFamily: cf.bold, fontSize: 14, color: cc.text },
  detail: { fontFamily: cf.body, fontSize: 13, lineHeight: 18, color: cc.textMuted },
});
