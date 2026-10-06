import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CATEGORY_TONE, cc, cf, cr } from '../constants/customerTheme';
import type { Booking } from '../types/booking';
import { formatBookingDate, formatTimeSlot } from '../utils/display';
import { formatLKR } from '../utils/helpers';

function Row({
  icon,
  color = cc.primary,
  label,
  value,
  sub,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  color?: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={color} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// Service receipt shared by Booking Confirmation and Track Booking (reference:
// booking_image.jpeg): service well, date & time, address, price lines and the
// estimated total. Values come from the booking.
export default function BookingSummary({ booking, showProblem = true }: { booking: Booking; showProblem?: boolean }) {
  const { address, pricing } = booking;
  const tone = CATEGORY_TONE[booking.service.category];
  return (
    <View style={styles.container}>
      <View style={styles.serviceWell}>
        <View style={[styles.serviceIcon, { backgroundColor: tone.bg }]}>
          <MaterialCommunityIcons name={tone.icon} size={20} color={tone.tint} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>SERVICE</Text>
          <Text style={styles.serviceName}>{booking.service.name}</Text>
        </View>
      </View>
      <Row
        icon="calendar-outline"
        label="DATE & TIME"
        value={`${formatBookingDate(booking.scheduledDate)} • ${formatTimeSlot(booking.timeSlot).split(' – ')[0]}`}
        sub={`Arrival window: ${formatTimeSlot(booking.timeSlot)}`}
      />
      <Row
        icon="location-outline"
        color={cc.amber}
        label="ADDRESS"
        value={`${address.street}, ${address.city}`}
        sub={address.landmark ? `Landmark: ${address.landmark}` : undefined}
      />
      {showProblem ? (
        <Row icon="document-text-outline" color={cc.textMuted} label="PROBLEM" value={booking.problemDescription} />
      ) : null}

      <View style={styles.prices}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{booking.service.name}</Text>
          <Text style={styles.priceValue}>{formatLKR(pricing.servicePrice)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Service Visiting Fee</Text>
          <Text style={styles.priceValue}>{pricing.visitFee > 0 ? formatLKR(pricing.visitFee) : 'Free'}</Text>
        </View>
        <View style={[styles.priceRow, styles.totalRow]}>
          <View style={styles.rowText}>
            <Text style={styles.totalLabel}>ESTIMATED TOTAL</Text>
            <Text style={styles.payNote}>Pay cash on completion</Text>
          </View>
          <Text style={styles.totalValue}>{formatLKR(pricing.total)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  serviceWell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    padding: 12,
  },
  serviceIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontFamily: cf.semibold, fontSize: 15, color: cc.text },
  row: { flexDirection: 'row', gap: 12 },
  rowIcon: { marginTop: 1 },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.6 },
  rowValue: { fontFamily: cf.bold, fontSize: 15, color: cc.text },
  rowSub: { fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  prices: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: cc.outlineSoft },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  priceLabel: { flex: 1, fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  priceValue: { fontFamily: cf.medium, fontSize: 13, color: cc.text },
  totalRow: { marginTop: 4 },
  totalLabel: { fontFamily: cf.semibold, fontSize: 12, color: cc.textMuted, letterSpacing: 0.6 },
  payNote: { fontFamily: cf.medium, fontSize: 12, color: cc.success, marginTop: 2 },
  totalValue: { flexShrink: 0, fontFamily: cf.heading, fontSize: 22, color: cc.primary },
});
