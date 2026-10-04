import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import type { Booking } from '../types/booking';
import { getArrivalInfo, type ArrivalKind } from '../utils/bookingProgress';

const ICONS: Record<ArrivalKind, ComponentProps<typeof Ionicons>['name']> = {
  requested: 'hourglass-outline',
  expected: 'time-outline',
  en_route: 'car-outline',
  completed: 'checkmark-done-outline',
};

// Arrival / dispatch information (Booking Confirmation Variant B). Uses the
// scheduled arrival window and status history only — never a fake live ETA.
export default function ArrivalCard({ booking }: { booking: Booking }) {
  const info = getArrivalInfo(booking);
  if (!info) return null;

  const highlight = info.kind === 'expected' || info.kind === 'en_route';
  return (
    <View
      style={[styles.card, highlight && styles.highlight]}
      accessible
      accessibilityLabel={`${info.title}: ${info.value}. ${info.detail}`}
      testID="arrival-card"
    >
      <View style={[styles.icon, highlight && styles.iconHighlight]}>
        <Ionicons name={ICONS[info.kind]} size={22} color={highlight ? colors.white : colors.primary} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, highlight && styles.titleHighlight]}>{info.title.toUpperCase()}</Text>
        <Text style={[styles.value, highlight && styles.valueHighlight]}>{info.value}</Text>
        <Text style={[styles.detail, highlight && styles.detailHighlight]}>{info.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  highlight: { backgroundColor: colors.primary },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHighlight: { backgroundColor: colors.primaryDark },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.6 },
  titleHighlight: { color: '#CFE2F5' },
  value: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  valueHighlight: { color: colors.white },
  detail: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  detailHighlight: { color: '#DCEAF7' },
});
