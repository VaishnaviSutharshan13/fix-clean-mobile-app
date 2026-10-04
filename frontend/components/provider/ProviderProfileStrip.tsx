import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import type { ProviderAccount } from '../../types/provider';
import { CATEGORY_META } from '../../utils/display';
import Avatar from '../Avatar';

type Props = { account: ProviderAccount; variant?: 'pill' | 'live' };

// Provider identity card (Dashboard / Booking Requests): name, verification
// tick, trade • district, and duty status.
export default function ProviderProfileStrip({ account, variant = 'pill' }: Props) {
  const verified = account.verificationStatus === 'verified';
  const onDuty = account.availability.isAvailable;
  return (
    <View style={styles.card}>
      <View>
        <Avatar name={account.name} size={52} />
        {verified ? (
          <View style={styles.tick}>
            <Ionicons name="checkmark" size={10} color={colors.white} />
          </View>
        ) : null}
      </View>
      <View style={styles.text}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {account.name}
          </Text>
          {verified ? (
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} accessibilityLabel="Verified" />
          ) : null}
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {CATEGORY_META[account.category].label} Specialist • {account.serviceArea}
        </Text>
      </View>
      {variant === 'pill' ? (
        <View style={[styles.pill, !onDuty && styles.pillOff]} accessibilityLabel={onDuty ? 'On duty' : 'Off duty'}>
          <View style={[styles.pillDot, !onDuty && styles.pillDotOff]} />
          <Text style={[styles.pillText, !onDuty && styles.pillTextOff]}>{onDuty ? 'ON DUTY' : 'OFF DUTY'}</Text>
        </View>
      ) : (
        <View style={styles.live}>
          <Text style={styles.liveLabel}>Live Status</Text>
          <View style={[styles.liveChip, !onDuty && styles.pillOff]}>
            <View style={[styles.liveDot, !onDuty && styles.pillDotOff]} />
            <Text style={[styles.liveText, !onDuty && styles.pillTextOff]}>{onDuty ? 'Available' : 'Off duty'}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  tick: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 19, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.duty,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  pillOff: { backgroundColor: colors.lavenderStrong },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dutyText },
  pillDotOff: { backgroundColor: colors.textMuted },
  pillText: { fontSize: 12, fontWeight: '800', color: colors.dutyText, letterSpacing: 0.4 },
  pillTextOff: { color: colors.textMuted },
  live: { alignItems: 'flex-end', gap: 2 },
  liveLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveText: { fontSize: 12, fontWeight: '700', color: colors.success },
});
