import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, CATEGORY_TONE, cc, cf, cr } from '../constants/customerTheme';
import type { Booking } from '../types/booking';
import { formatBookingDate, formatTimeSlot, STATUS_META } from '../utils/display';
import { formatLKR } from '../utils/helpers';

export type BookingCardProps = {
  booking: Booking;
  onPress: () => void;
};

// Compact booking row used on Customer Home ("My bookings"); opens Track Booking.
export default function BookingCard({ booking, onPress }: BookingCardProps) {
  const tone = CATEGORY_TONE[booking.service.category];
  const status = STATUS_META[booking.status];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Booking ${booking.reference}, ${booking.service.name} with ${booking.provider.name}, ${status.label}. Opens tracking.`}
    >
      <View style={[styles.icon, { backgroundColor: tone.bg }]}>
        <MaterialCommunityIcons name={tone.icon} size={22} color={tone.tint} />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {booking.service.name}
          </Text>
          <View style={[styles.status, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {booking.provider.name} • {booking.reference}
        </Text>
        <View style={styles.row}>
          <Text style={styles.sub} numberOfLines={1}>
            {formatBookingDate(booking.scheduledDate, false)} • {formatTimeSlot(booking.timeSlot).split(' – ')[0]}
          </Text>
          <Text style={styles.price}>{formatLKR(booking.pricing.total)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={cc.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cc.card,
    borderRadius: cr.lg,
    padding: 14,
    ...cardShadow,
  },
  pressed: { opacity: 0.92 },
  icon: { width: 44, height: 44, borderRadius: cr.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontFamily: cf.headingSemi, fontSize: 15, color: cc.text },
  status: { borderRadius: cr.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontFamily: cf.semibold, fontSize: 11 },
  sub: { flexShrink: 1, fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  price: { fontFamily: cf.bold, fontSize: 13, color: cc.text },
});
