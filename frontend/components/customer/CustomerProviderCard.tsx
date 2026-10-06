import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, CATEGORY_TONE, cc, cf, cr } from '../../constants/customerTheme';
import type { Provider } from '../../types/provider';
import { sriLankaToday } from '../../utils/display';
import { formatLKR } from '../../utils/helpers';
import { formatNextSlot, isAvailableToday } from '../../utils/nextSlot';
import CustomerAvatar from './CustomerAvatar';
import CustomerButton from './CustomerButton';
import { Pill } from './CustomerPrimitives';
import { photoUri } from '../../services/userService';

type Props = {
  provider: Provider;
  variant: 'recommended' | 'list';
  onOpen: () => void;
  onBook?: () => void;
};

export default function CustomerProviderCard({ provider, variant, onOpen, onBook }: Props) {
  const tone = CATEGORY_TONE[provider.category];
  const verified = provider.verificationStatus === 'verified';
  const reviewed = provider.reviewCount > 0;
  const today = sriLankaToday().date;
  const nextSlot = formatNextSlot(provider.nextSlot, today);
  const availableToday = isAvailableToday(provider.nextSlot, today);
  const a11y = `${provider.name}, ${provider.headline}, from ${formatLKR(provider.startingPrice)}`;

  // HOME SCREEN (homepage.jpeg)
  if (variant === 'recommended') {
    return (
      <View style={styles.card}>
        <Pressable
          onPress={onOpen}
          style={styles.top}
          accessibilityRole="button"
          accessibilityLabel={a11y}
          accessibilityHint="Opens provider profile"
        >
          <CustomerAvatar imageUrl={photoUri(provider.avatarUrl)} name={provider.name} size={56} shape="circle" verified={verified} ring bg={tone.bg} />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.nameHome} numberOfLines={1}>
                {provider.name}
              </Text>
              <Text style={[styles.priceHome, { color: tone.price }]}>
                {formatLKR(provider.startingPrice)}
              </Text>
            </View>
            <View style={styles.headlineRow}>
              <Text style={styles.headline} numberOfLines={1}>
                {provider.headline}
              </Text>
              <Text style={styles.dot}>•</Text>
              <Text style={[styles.availableToday, !provider.isAvailable && styles.offDuty]}>
                {availableToday ? 'Available Today' : provider.isAvailable ? 'On duty' : 'Off duty'}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={cc.star} />
              <Text style={styles.ratingValue}>{reviewed ? provider.ratingAverage.toFixed(1) : 'New'}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaText}>{provider.experienceYears}+ yrs exp</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaText}>
                {provider.completedJobs} {provider.completedJobs === 1 ? 'job' : 'jobs'} done
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.bottomHome}>
          <View style={styles.slotRow}>
            <Ionicons name={nextSlot ? 'time-outline' : 'location-outline'} size={15} color={cc.textMuted} />
            <Text style={styles.slotText} numberOfLines={1}>
              {nextSlot ? `Next slot: ${nextSlot}` : provider.serviceArea}
            </Text>
          </View>
          <View style={styles.homeActions}>
            <CustomerButton
              title={provider.isAvailable ? 'Book Now' : 'View Profile'}
              icon="arrow-forward"
              onPress={provider.isAvailable && onBook ? onBook : onOpen}
              style={styles.bookBtn}
              accessibilityLabel={`${provider.isAvailable ? 'Book' : 'View'} ${provider.name}`}
            />
          </View>
        </View>
      </View>
    );
  }

  // WORKERS LIST SCREEN (workers.jpeg)
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="Opens provider profile"
    >
      <View style={styles.top}>
        <CustomerAvatar imageUrl={photoUri(provider.avatarUrl)} name={provider.name} size={62} shape="circle" verified={verified} ring bg={tone.bg} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.nameList} numberOfLines={1}>
              {provider.name}
            </Text>
            {verified ? <Pill label="Verified" tone="verified" icon="checkmark-circle" /> : null}
          </View>
          <Text style={styles.headlineList} numberOfLines={1}>
            {provider.headline}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={cc.star} />
            <Text style={styles.ratingValue}>{reviewed ? provider.ratingAverage.toFixed(1) : 'New'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>
              ({provider.reviewCount} {provider.reviewCount === 1 ? 'review' : 'reviews'})
            </Text>
          </View>
        </View>
      </View>

      {/* Info strip: next open slot (from the schedule), area and experience */}
      <View style={styles.strip}>
        <Ionicons name="time-outline" size={14} color={availableToday ? cc.success : cc.primary} />
        <Text style={[styles.stripText, styles.stripMain, availableToday && styles.stripToday]} numberOfLines={1}>
          {nextSlot ? `Next: ${nextSlot}` : 'No open slots'}
        </Text>
        <Text style={styles.stripDot}>•</Text>
        <Ionicons name="location-outline" size={14} color={cc.primary} />
        <Text style={styles.stripText} numberOfLines={1}>
          {provider.serviceArea}
        </Text>
      </View>

      <View style={styles.bottomList}>
        <View style={styles.rateCol}>
          <Text style={styles.rateLabel}>Starting from</Text>
          <Text style={styles.priceList} numberOfLines={1}>
            {formatLKR(provider.startingPrice)}
          </Text>
        </View>
        <View style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>View Profile</Text>
          <Ionicons name="arrow-forward" size={16} color={cc.onPrimary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cc.card,
    borderRadius: cr.lg,
    padding: 16,
    gap: 14,
    ...cardShadow,
  },
  pressed: { opacity: 0.92 },
  top: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  info: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameHome: { flex: 1, fontFamily: cf.headingSemi, fontSize: 18, color: cc.text },
  nameList: { flex: 1, fontFamily: cf.headingSemi, fontSize: 19, color: cc.text },
  priceHome: { fontFamily: cf.heading, fontSize: 18 },
  headlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headline: { flexShrink: 1, fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  headlineList: { fontFamily: cf.body, fontSize: 14, color: cc.textMuted },
  availableToday: { flexShrink: 0, fontFamily: cf.semibold, fontSize: 13, color: cc.success },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  ratingValue: { fontFamily: cf.bold, fontSize: 14, color: cc.text },
  dot: { fontSize: 12, color: cc.textSubtle, marginHorizontal: 2 },
  metaText: { fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  bottomHome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: cc.containerLow,
    gap: 10,
  },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  slotText: { fontFamily: cf.medium, fontSize: 13, color: cc.textMuted },
  homeActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookBtn: { minHeight: 42, paddingHorizontal: 16, borderRadius: cr.md },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  stripText: { fontFamily: cf.medium, fontSize: 13, color: cc.text, flexShrink: 1 },
  stripDot: { fontSize: 12, color: cc.textSubtle },
  bottomList: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 2,
  },
  rateCol: { gap: 2 },
  rateLabel: { fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  priceList: { fontFamily: cf.heading, fontSize: 21, color: cc.primary },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: cc.primary,
    borderRadius: cr.md,
    paddingHorizontal: 18,
    minHeight: 46,
  },
  viewBtnText: { fontFamily: cf.semibold, fontSize: 15, color: cc.onPrimary },
  offDuty: { color: cc.textSubtle },
  stripToday: { color: cc.success },
  stripMain: { flexShrink: 0 },
});
