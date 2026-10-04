import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import type { Booking } from '../types/booking';
import { formatBookingDate, formatTimeSlot } from '../utils/display';
import { formatLKR } from '../utils/helpers';

function Row({ icon, label, value, sub }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string; sub?: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.primary} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// Service, schedule, address and price details shared by Confirmation and Tracking.
export default function BookingSummary({ booking, showProblem = true }: { booking: Booking; showProblem?: boolean }) {
  const { address, pricing } = booking;
  return (
    <View style={styles.container}>
      <Row icon="construct-outline" label="SERVICE" value={booking.service.name} />
      <Row
        icon="calendar-outline"
        label="DATE & TIME"
        value={formatBookingDate(booking.scheduledDate)}
        sub={formatTimeSlot(booking.timeSlot)}
      />
      <Row
        icon="location-outline"
        label="ADDRESS"
        value={`${address.street}, ${address.city}`}
        sub={address.landmark ? `Landmark: ${address.landmark}` : undefined}
      />
      {showProblem ? <Row icon="document-text-outline" label="PROBLEM" value={booking.problemDescription} /> : null}

      <View style={styles.prices}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{booking.service.name}</Text>
          <Text style={styles.priceValue}>{formatLKR(pricing.servicePrice)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Visiting fee</Text>
          <Text style={styles.priceValue}>{pricing.visitFee > 0 ? formatLKR(pricing.visitFee) : 'Free'}</Text>
        </View>
        <View style={[styles.priceRow, styles.totalRow]}>
          <View>
            <Text style={styles.totalLabel}>ESTIMATED TOTAL</Text>
            <Text style={styles.payNote}>Cash on service · pay after the job</Text>
          </View>
          <Text style={styles.totalValue}>{formatLKR(pricing.total)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  rowIcon: { marginTop: 2 },
  rowText: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4 },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 13, color: colors.textMuted },
  prices: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  priceValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  totalRow: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, marginTop: 4 },
  totalLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  payNote: { fontSize: 11, color: colors.success, marginTop: 2 },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
});
