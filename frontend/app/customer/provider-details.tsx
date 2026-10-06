import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import CustomerAvatar from '../../components/customer/CustomerAvatar';
import CustomerButton from '../../components/customer/CustomerButton';
import { CustomerHeader } from '../../components/customer/CustomerHeader';
import { CCard, IconTile, Pill, SectionTitle } from '../../components/customer/CustomerPrimitives';
import CustomerScreen from '../../components/customer/CustomerScreen';
import { cardShadow, CATEGORY_TONE, cc, cf, cr, GUTTER } from '../../constants/customerTheme';
import { useAsync } from '../../hooks/useAsync';
import { providerService } from '../../services/providerService';
import { reviewService } from '../../services/reviewService';
import type { Review } from '../../types/provider';
import { CATEGORY_META, formatRelative, sriLankaToday } from '../../utils/display';
import { formatNextSlot, isAvailableToday } from '../../utils/nextSlot';
import { formatLKR, getFriendlyErrorMessage, getInitials } from '../../utils/helpers';
import { photoUri } from '../../services/userService';

const CATEGORY_COVERS = {
  plumbing: require('../../assets/images/covers/plumbing.jpg'),
  electrical: require('../../assets/images/covers/electrical.jpg'),
  cleaning: require('../../assets/images/covers/cleaning.jpg'),
} as const;

function ReviewStars({ value }: { value: number }) {
  return (
    <View style={styles.stars} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? 'star' : 'star-outline'} size={16} color={cc.amberBright} />
      ))}
    </View>
  );
}

// Technician Profile (reference: worker_profile.jpeg) filled with real API
// data: tinted cover + avatar, verification, rating/reviews, completed jobs,
// experience, service rate and visit fee, verification checks, bio, services
// (selection carries into Book Service), paged customer reviews, BOOK NOW.
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

  if (loading && !provider) return <Loading message="Loading technician profile…" />;
  if (error || !provider) {
    return (
      <CustomerScreen header={<CustomerHeader title="Technician Profile" />}>
        <StateView
          title="Couldn't load this technician"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </CustomerScreen>
    );
  }

  const tone = CATEGORY_TONE[provider.category];
  const { min, max } = provider.priceRange;
  const verified = provider.verificationStatus === 'verified';
  const reviewed = provider.reviewCount > 0;
  const canBook = provider.services.length > 0 && provider.availability.isAvailable;
  const today = sriLankaToday().date;
  const nextSlot = formatNextSlot(provider.nextSlot, today);
  const availableToday = isAvailableToday(provider.nextSlot, today);

  const handleBook = () => {
    router.push({
      pathname: '/customer/book-service',
      params: { providerId: provider.id, ...(selectedServiceId ? { serviceId: selectedServiceId } : {}) },
    });
  };

  return (
    <CustomerScreen
      header={<CustomerHeader title="Technician Profile" />}
      contentStyle={styles.content}
      footer={
        <View style={styles.footerBar}>
          {/* The provider's phone is shared only after they confirm a booking (NFR5). */}
          <CustomerButton
            title="BOOK NOW"
            icon="arrow-forward"
            large
            onPress={handleBook}
            disabled={!canBook}
            style={styles.bookBtn}
            accessibilityHint="Opens the booking form"
          />
        </View>
      }
    >
      {/* Cover: a photo of the service category (bundled, Unsplash License) */}
      <View style={[styles.heroContainer, { backgroundColor: tone.bg }]}>
        <Image
          source={CATEGORY_COVERS[provider.category]}
          style={styles.heroImage}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${CATEGORY_META[provider.category].label} service`}
        />
      </View>

      {/* Avatar & Badges overlay */}
      <View style={styles.avatarOverlayRow}>
        <View style={styles.avatarWithPill}>
          <CustomerAvatar
            imageUrl={photoUri(provider.avatarUrl)}
            name={provider.name}
            size={88}
            shape="circle"
            verified={verified}
            ring
            tint={tone.tint}
            bg={cc.card}
          />
          {provider.availability.isAvailable ? (
            <View style={styles.todayPill}>
              <Text style={styles.todayPillText}>{availableToday ? 'Available Today' : 'On duty'}</Text>
            </View>
          ) : null}
        </View>

        {verified ? (
          <View style={styles.verifiedProBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#00513A" />
            <Text style={styles.verifiedProText}>Verified Pro</Text>
          </View>
        ) : null}
      </View>

      {/* Name and Headline */}
      <View style={styles.nameBlock}>
        <Text style={styles.name} accessibilityRole="header">
          {provider.name}
        </Text>
        <View style={styles.headlineRow}>
          <MaterialCommunityIcons name={tone.icon} size={17} color={cc.primary} />
          <Text style={styles.headline}>
            {provider.headline} • {provider.serviceArea}
          </Text>
        </View>
      </View>

      {!provider.availability.isAvailable ? (
        <FormMessage message={`${provider.name} is not accepting new bookings right now.`} />
      ) : null}

      {/* Stats Cards: Rating (Job Success) and Experience */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Ionicons name="star" size={17} color={cc.amberBright} />
            <Text style={styles.statTitle}>
              {reviewed ? provider.ratingAverage.toFixed(1) : 'New'}{' '}
              <Text style={styles.statSubTitle}>
                ({provider.reviewCount} {provider.reviewCount === 1 ? 'review' : 'reviews'})
              </Text>
            </Text>
          </View>
          <Text style={styles.statHighlight}>
            {provider.completedJobs} {provider.completedJobs === 1 ? 'job' : 'jobs'} completed
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Ionicons name="ribbon-outline" size={17} color={cc.primary} />
            <Text style={styles.statTitle}>{provider.experienceYears}+ Years</Text>
          </View>
          <Text style={styles.statLabel}>Field Experience</Text>
        </View>
      </View>

      {/* Standard service rate and visit fee */}
      <View style={styles.rateCard}>
        <View style={styles.rateTextWrap}>
          <Text style={styles.rateLabel}>STANDARD SERVICE RATE</Text>
          <Text style={styles.rateValue}>
            {min === max ? formatLKR(min) : `${formatLKR(min)} – ${formatLKR(max).replace('Rs. ', '')}`}
          </Text>
          {nextSlot ? (
            <View style={styles.nextSlotRow}>
              <Ionicons name="time-outline" size={14} color={cc.success} />
              <Text style={styles.nextSlotText}>Next slot: {nextSlot}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.instantQuoteBtn}>
          <Ionicons name="home-outline" size={14} color={cc.primary} />
          <Text style={styles.instantQuoteText}>
            {provider.visitFee > 0 ? `+ ${formatLKR(provider.visitFee)} visit` : 'No visit fee'}
          </Text>
        </View>
      </View>

      {/* FR2: verification checks completed by the admin */}
      <View style={styles.checksRow} accessibilityLabel="Verification checks">
        {(['identity', 'contact', 'experience'] as const).map((key) => {
          const passed = provider.verificationChecks[key];
          const label = key[0]!.toUpperCase() + key.slice(1);
          return (
            <Pill
              key={key}
              label={`${label} ${passed ? 'checked' : 'pending'}`}
              tone={passed ? 'success' : 'soft'}
              icon={passed ? 'checkmark-circle' : 'ellipse-outline'}
            />
          );
        })}
      </View>

      {provider.bio ? (
        <View style={styles.section}>
          <SectionTitle title="About" />
          <CCard>
            <Text style={styles.serviceDesc}>{provider.bio}</Text>
          </CCard>
        </View>
      ) : null}

      {/* Services Offered matching Figma */}
      <View style={styles.section}>
        <SectionTitle
          title="Services Offered"
          right={
            <Text style={styles.sectionCount}>
              {provider.services.length} {provider.services.length === 1 ? 'specialty' : 'specialties'}
            </Text>
          }
        />
        {provider.services.map((service) => {
          const selected = service.id === selectedServiceId;
          return (
            <Pressable
              key={service.id}
              onPress={() => setSelectedServiceId(service.id)}
              style={[styles.serviceCard, selected && styles.serviceCardSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${service.name}, from ${formatLKR(service.price)}`}
            >
              <View style={[styles.serviceIconTile, selected && styles.serviceIconSelected]}>
                <MaterialCommunityIcons
                  name={selected ? 'check' : tone.icon}
                  size={22}
                  color={selected ? cc.onPrimary : cc.primary}
                />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                {service.description ? <Text style={styles.serviceDesc}>{service.description}</Text> : null}
              </View>
              <View style={styles.servicePriceWrap}>
                <Text style={styles.fromLabel}>From</Text>
                <Text style={styles.servicePrice}>{formatLKR(service.price)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Verified Customer Feedback matching Figma */}
      <View style={styles.section}>
        <SectionTitle
          title="Verified Customer Feedback"
          right={
            <Text style={styles.sectionCount}>
              {reviewsTotal} {reviewsTotal === 1 ? 'review' : 'reviews'}
            </Text>
          }
        />
        {reviews.length === 0 ? (
          <Text style={styles.serviceDesc}>No reviews yet. Reviews appear after completed bookings.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <ReviewStars value={review.rating} />
                <Text style={styles.reviewDate}>{formatRelative(review.createdAt)}</Text>
              </View>
              {review.comment ? <Text style={styles.reviewComment}>“{review.comment}”</Text> : null}
              <View style={styles.reviewerFooter}>
                <View style={styles.reviewerInitial}>
                  <Text style={styles.reviewerLetter}>{getInitials(review.customerName).slice(0, 1)}</Text>
                </View>
                <Text style={styles.reviewerName}>{review.customerName}</Text>
                <View style={styles.reviewLocation}>
                  <Ionicons name="checkmark-circle-outline" size={13} color={cc.success} />
                  <Text style={styles.reviewCity}>Completed booking</Text>
                </View>
              </View>
            </View>
          ))
        )}
        {reviewsError ? <Text style={styles.reviewCity}>{reviewsError}</Text> : null}
        {reviews.length < reviewsTotal ? (
          <CustomerButton
            title={`Show more reviews (${reviewsTotal - reviews.length})`}
            variant="soft"
            onPress={loadMoreReviews}
            loading={loadingReviews}
          />
        ) : null}
      </View>

      {/* Trust card: statements the app enforces */}
      <View style={styles.guaranteeCard}>
        <View style={styles.shieldIconTile}>
          <Ionicons name="shield-checkmark" size={24} color={cc.primary} />
        </View>
        <View style={styles.guaranteeText}>
          <Text style={styles.guaranteeTitle}>Fix &amp; Clean Verified</Text>
          <Text style={styles.guaranteeDesc}>
            Identity, contact and experience are checked by our admin team before a provider can be booked.
          </Text>
        </View>
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 0, paddingBottom: 20, gap: 16 },
  heroContainer: {
    height: 180,
    marginHorizontal: -GUTTER,
    backgroundColor: '#E4ECF4',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 16,
  },
  avatarOverlayRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -48,
    paddingHorizontal: 4,
  },
  avatarWithPill: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  todayPill: {
    backgroundColor: cc.successSoft,
    borderRadius: cr.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  todayPillText: { fontFamily: cf.semibold, fontSize: 11, color: cc.success },
  verifiedProBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6FFBBE',
    borderRadius: cr.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
  },
  verifiedProText: { fontFamily: cf.bold, fontSize: 12, color: '#00513A' },
  nameBlock: { gap: 4, marginTop: -4 },
  name: { fontFamily: cf.heading, fontSize: 24, color: cc.text, letterSpacing: -0.4 },
  headlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headline: { fontFamily: cf.body, fontSize: 15, color: cc.textMuted },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    padding: 12,
    gap: 4,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTitle: { fontFamily: cf.headingSemi, fontSize: 15, color: cc.text },
  statSubTitle: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  statHighlight: { fontFamily: cf.semibold, fontSize: 12, color: cc.primary },
  statLabel: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cc.container,
    borderRadius: cr.lg,
    padding: 16,
    gap: 12,
  },
  rateTextWrap: { flex: 1 },
  rateLabel: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.6 },
  rateValue: { fontFamily: cf.heading, fontSize: 20, color: cc.primary, marginTop: 2 },
  instantQuoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: cr.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: cc.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  instantQuoteText: { fontFamily: cf.semibold, fontSize: 12, color: cc.primary },
  section: { gap: 12 },
  sectionCount: { fontFamily: cf.semibold, fontSize: 13, color: cc.primary },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cc.card,
    borderRadius: cr.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: cc.card,
    ...cardShadow,
  },
  serviceCardSelected: { borderColor: cc.primary },
  serviceIconTile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cc.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconSelected: { backgroundColor: cc.primary },
  serviceInfo: { flex: 1, minWidth: 0, gap: 2 },
  serviceName: { fontFamily: cf.headingSemi, fontSize: 15, color: cc.text },
  serviceDesc: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  servicePriceWrap: { alignItems: 'flex-end' },
  fromLabel: { fontFamily: cf.medium, fontSize: 11, color: cc.primary },
  servicePrice: { fontFamily: cf.heading, fontSize: 15, color: cc.primary },
  reviewCard: {
    backgroundColor: cc.card,
    borderRadius: cr.lg,
    padding: 16,
    gap: 10,
    ...cardShadow,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stars: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  reviewComment: { fontFamily: cf.body, fontSize: 14, lineHeight: 21, color: cc.text },
  reviewerFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  reviewerInitial: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: cc.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerLetter: { fontFamily: cf.bold, fontSize: 12, color: '#FFFFFF' },
  reviewerName: { flex: 1, fontFamily: cf.semibold, fontSize: 13, color: cc.text },
  reviewLocation: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewCity: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  guaranteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: cc.container,
    borderRadius: cr.lg,
    padding: 16,
  },
  shieldIconTile: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: cc.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeText: { flex: 1, gap: 2 },
  guaranteeTitle: { fontFamily: cf.headingSemi, fontSize: 15, color: cc.text },
  guaranteeDesc: { fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: GUTTER,
    paddingVertical: 12,
    backgroundColor: cc.bg,
    borderTopWidth: 1,
    borderTopColor: cc.outlineSoft,
  },
  bookBtn: { flex: 1 },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  nextSlotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  nextSlotText: { fontFamily: cf.semibold, fontSize: 13, color: cc.success },
  checksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
