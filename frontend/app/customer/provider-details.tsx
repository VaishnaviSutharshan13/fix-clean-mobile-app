import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import Rating, { Stars } from '../../components/Rating';
import Screen from '../../components/Screen';
import StateView from '../../components/StateView';
import VerifiedBadge from '../../components/VerifiedBadge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { providerService } from '../../services/providerService';
import { reviewService } from '../../services/reviewService';
import type { Review } from '../../types/provider';
import { CATEGORY_META, formatRelative } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';

const CHECK_LABELS = [
  { key: 'identity', label: 'Identity' },
  { key: 'contact', label: 'Contact' },
  { key: 'experience', label: 'Experience' },
] as const;

// Provider Details (Milestone 02, Variant B): decision support before booking —
// rating/reviews (FR1), verification checks (FR2), experience, completed jobs
// and per-service prices.
export default function ProviderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: provider, error, loading, reload } = useAsync(() => providerService.details(id), [id]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string>();

  useEffect(() => {
    if (!provider) return;
    setReviews(provider.recentReviews);
    setReviewsTotal(provider.reviewCount);
    setSelectedServiceId((current) => current ?? provider.services[0]?.id);
  }, [provider]);

  const loadMoreReviews = async () => {
    setLoadingReviews(true);
    setReviewsError(undefined);
    try {
      const page = await reviewService.listForProvider(id, 10, reviews.length);
      setReviews((current) => [...current, ...page.items]);
      setReviewsTotal(page.total);
    } catch (err) {
      setReviewsError(getFriendlyErrorMessage(err));
    } finally {
      setLoadingReviews(false);
    }
  };

  if (loading && !provider) return <Loading message="Loading profile…" />;
  if (error || !provider) {
    return (
      <Screen header={<Header title="Provider Profile" />}>
        <StateView
          title="Couldn't load this provider"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </Screen>
    );
  }

  const category = CATEGORY_META[provider.category];
  const { min, max } = provider.priceRange;

  const handleBook = () => {
    router.push({
      pathname: '/customer/book-service',
      params: { providerId: provider.id, ...(selectedServiceId ? { serviceId: selectedServiceId } : {}) },
    });
  };

  return (
    <Screen
      header={<Header title="Provider Profile" />}
      footer={
        <Button
          title="BOOK NOW"
          icon="arrow-forward"
          onPress={handleBook}
          disabled={provider.services.length === 0}
          accessibilityHint="Opens the booking form for the selected service"
        />
      }
    >
      {/* Identity */}
      <Card>
        <View style={styles.identity}>
          <Avatar name={provider.name} size={72} />
          <View style={styles.identityText}>
            <VerifiedBadge status={provider.verificationStatus} />
            <Text style={styles.name}>{provider.name}</Text>
            <Text style={styles.headline}>
              {provider.headline} · {provider.serviceArea}
            </Text>
            <View style={styles.categoryPill}>
              <Ionicons name={category.icon} size={13} color={category.tint} />
              <Text style={[styles.categoryText, { color: category.tint }]}>{category.label}</Text>
            </View>
          </View>
        </View>

        {/* FR2: which checks were completed */}
        <View style={styles.checks} accessibilityLabel="Verification checks">
          {CHECK_LABELS.map(({ key, label }) => {
            const passed = provider.verificationChecks[key];
            return (
              <View key={key} style={styles.check}>
                <Ionicons
                  name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={passed ? colors.success : colors.textSubtle}
                />
                <Text style={styles.checkText}>
                  {label} {passed ? 'checked' : 'pending'}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Key stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Rating value={provider.ratingAverage} size={15} />
          <Text style={styles.statLabel}>
            {provider.reviewCount} {provider.reviewCount === 1 ? 'review' : 'reviews'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{provider.experienceYears}+ yrs</Text>
          <Text style={styles.statLabel}>Experience</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{provider.completedJobs}</Text>
          <Text style={styles.statLabel}>Jobs done</Text>
        </View>
      </View>

      <View style={styles.rateCard}>
        <Text style={styles.rateLabel}>STANDARD SERVICE RATE</Text>
        <Text style={styles.rateValue}>{min === max ? formatLKR(min) : `${formatLKR(min)} – ${formatLKR(max)}`}</Text>
        <Text style={styles.rateNote}>
          {provider.visitFee > 0 ? `+ ${formatLKR(provider.visitFee)} visiting fee per booking` : 'No visiting fee'}
        </Text>
      </View>

      {provider.bio ? (
        <Card title="About">
          <Text style={styles.bio}>{provider.bio}</Text>
        </Card>
      ) : null}

      {/* Services with prices; selection carries into Book Service */}
      <Card
        title="Services offered"
        right={<Text style={styles.cardHint}>{provider.services.length} services</Text>}
      >
        <Text style={styles.cardSub}>Select a service to book.</Text>
        {provider.services.map((service) => {
          const selected = service.id === selectedServiceId;
          return (
            <Pressable
              key={service.id}
              onPress={() => setSelectedServiceId(service.id)}
              style={[styles.service, selected && styles.serviceSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${service.name}, from ${formatLKR(service.price)}`}
            >
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? colors.primary : colors.textSubtle}
              />
              <View style={styles.serviceText}>
                <Text style={styles.serviceName}>{service.name}</Text>
                {service.description ? <Text style={styles.serviceDesc}>{service.description}</Text> : null}
              </View>
              <View style={styles.servicePrice}>
                <Text style={styles.fromLabel}>From</Text>
                <Text style={styles.priceText}>{formatLKR(service.price)}</Text>
              </View>
            </Pressable>
          );
        })}
      </Card>

      {/* FR1: verified customer feedback */}
      <Card title="Customer feedback" right={<Rating value={provider.ratingAverage} count={reviewsTotal} size={13} />}>
        {reviews.length === 0 ? (
          <Text style={styles.cardSub}>No reviews yet. Reviews appear after completed bookings.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.review}>
              <View style={styles.reviewHeader}>
                <Stars value={review.rating} size={13} />
                <Text style={styles.reviewDate}>{formatRelative(review.createdAt)}</Text>
              </View>
              {review.comment ? <Text style={styles.reviewText}>“{review.comment}”</Text> : null}
              <Text style={styles.reviewer}>{review.customerName} · Completed booking</Text>
            </View>
          ))
        )}
        {reviewsError ? <Text style={styles.error}>{reviewsError}</Text> : null}
        {reviews.length < reviewsTotal ? (
          <Button
            title={`Show more reviews (${reviewsTotal - reviews.length})`}
            variant="ghost"
            onPress={loadMoreReviews}
            loading={loadingReviews}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  identityText: { flex: 1, gap: 4 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  headline: { fontSize: 14, color: colors.textMuted },
  categoryPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  checks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  check: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    alignItems: 'flex-start',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  rateCard: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  rateLabel: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.6 },
  rateValue: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  rateNote: { fontSize: 12, color: colors.textMuted },
  bio: { fontSize: 14, lineHeight: 20, color: colors.text },
  cardHint: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  cardSub: { fontSize: 13, color: colors.textMuted },
  service: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  serviceText: { flex: 1, gap: 2 },
  serviceName: { fontSize: 14, fontWeight: '700', color: colors.text },
  serviceDesc: { fontSize: 12, color: colors.textMuted },
  servicePrice: { alignItems: 'flex-end' },
  fromLabel: { fontSize: 11, color: colors.textMuted },
  priceText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  review: { gap: 4, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewDate: { fontSize: 12, color: colors.textMuted },
  reviewText: { fontSize: 14, lineHeight: 20, color: colors.text },
  reviewer: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger },
});
