import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import type { Booking } from '../types/booking';
import { CATEGORY_META, formatBookingDate, formatTimeSlot } from '../utils/display';
import { formatLKR } from '../utils/helpers';
import StatusBadge from './StatusBadge';

export type BookingCardProps = {
  booking: Booking;
  onPress: () => void;
};

// Compact booking summary used on Home ("My Bookings"); opens Track Booking.
export default function BookingCard({ booking, onPress }: BookingCardProps) {
  const category = CATEGORY_META[booking.service.category];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Booking ${booking.reference}, ${booking.service.name} with ${booking.provider.name}. Opens tracking.`}
    >
      <View style={[styles.icon, { backgroundColor: category.bg }]}>
        <Ionicons name={category.icon} size={20} color={category.tint} />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {booking.service.name}
          </Text>
          <StatusBadge status={booking.status} />
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {booking.provider.name} · {booking.reference}
        </Text>
        <View style={styles.row}>
          <Text style={styles.sub}>
            {formatBookingDate(booking.scheduledDate, false)} · {formatTimeSlot(booking.timeSlot).split(' – ')[0]}
          </Text>
          <Text style={styles.price}>{formatLKR(booking.pricing.total)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pressed: { opacity: 0.9 },
  icon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
  price: { fontSize: 13, fontWeight: '700', color: colors.text },
});
