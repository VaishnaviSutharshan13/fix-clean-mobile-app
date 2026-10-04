import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import type { Provider } from '../types/provider';
import { CATEGORY_META } from '../utils/display';
import { formatLKR } from '../utils/helpers';
import Avatar from './Avatar';
import Rating from './Rating';
import VerifiedBadge from './VerifiedBadge';

export type ProviderCardProps = {
  provider: Provider;
  onPress: () => void;
  actionLabel?: string;
};

// Provider List card (Variant A): verification, rating/reviews, pricing and a
// direct View Profile action (FR1, FR2).
export default function ProviderCard({ provider, onPress, actionLabel = 'View Profile' }: ProviderCardProps) {
  const category = CATEGORY_META[provider.category];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${provider.name}, ${provider.headline}`}
      accessibilityHint={`${actionLabel}`}
    >
      <View style={styles.top}>
        <Avatar name={provider.name} size={52} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {provider.name}
            </Text>
            <VerifiedBadge status={provider.verificationStatus} />
          </View>
          <Text style={styles.headline} numberOfLines={1}>
            {provider.headline}
          </Text>
          <Rating value={provider.ratingAverage} count={provider.reviewCount} size={13} />
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name={category.icon} size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{category.label}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{provider.serviceArea}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="briefcase-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{provider.experienceYears}+ yrs</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View>
          <Text style={styles.priceLabel}>Starting from</Text>
          <Text style={styles.price}>{formatLKR(provider.startingPrice)}</Text>
        </View>
        {/* Visual call-to-action; the whole card is the pressable target. */}
        <View style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: { opacity: 0.9 },
  top: { flexDirection: 'row', gap: spacing.md },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
  name: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  headline: { fontSize: 13, color: colors.textMuted },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.textMuted },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { fontSize: 11, color: colors.textMuted },
  price: { fontSize: 18, fontWeight: '800', color: colors.primary },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  actionText: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
