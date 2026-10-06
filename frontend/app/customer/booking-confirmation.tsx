import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import CustomerAvatar from '../../components/customer/CustomerAvatar';
import CustomerButton from '../../components/customer/CustomerButton';
import { CustomerHeader } from '../../components/customer/CustomerHeader';
import { CCard } from '../../components/customer/CustomerPrimitives';
import CustomerScreen from '../../components/customer/CustomerScreen';
import { CATEGORY_TONE, cc, cf, cr } from '../../constants/customerTheme';
import { useAsync } from '../../hooks/useAsync';
import { bookingService } from '../../services/bookingService';
import { getArrivalInfo } from '../../utils/bookingProgress';
import { formatBookingDate, formatTimeSlot, STATUS_META } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';
import { photoUri } from '../../services/userService';

const goHome = () => router.replace('/customer/home');

// Booking Confirmation (reference: booking_image.jpeg) with real booking data:
// success hero with the booking reference, dispatch / arrival information
// from the scheduled window, service receipt, Modify (while allowed), TRACK
// BOOKING. A new booking stays "requested" until the provider accepts it, so
// the screen says the request was sent rather than confirmed.
export default function BookingConfirmation() {
  const { id, updated } = useLocalSearchParams<{ id: string; updated?: string }>();
  const { data: booking, error, loading, reload } = useAsync(() => bookingService.getMine(id), [id]);

  if (loading && !booking) return <Loading message="Loading confirmation…" />;
  if (error || !booking) {
    return (
      <CustomerScreen header={<CustomerHeader title="Booking Confirmation" onBack={goHome} />}>
        <StateView
          title="Couldn't load confirmation"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </CustomerScreen>
    );
  }

  const tone = CATEGORY_TONE[booking.service.category];
  const status = STATUS_META[booking.status];
  const arrival = getArrivalInfo(booking);
  const confirmed = booking.status !== 'requested';
  const title = updated === '1' ? 'Booking Updated!' : confirmed ? 'Booking Confirmed!' : 'Booking Request Sent!';
  const subtitle = confirmed
    ? 'Follow every update on the tracking screen.'
    : `${booking.provider.name} will review your request and confirm it. You'll be notified when they respond.`;

  return (
    <CustomerScreen
      header={<CustomerHeader title="Booking Confirmation" onBack={goHome} />}
      contentStyle={styles.content}
    >
      <View style={styles.topCloseRow}>
        <Pressable onPress={goHome} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close and return to Home">
          <Ionicons name="close" size={14} color={cc.text} />
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.hero} accessibilityLiveRegion="polite">
        <View style={styles.haloRing}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <View style={styles.amberDot} />
        </View>
        <Text style={styles.heroTitle} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
        <View style={styles.orderRefPill}>
          <Text style={styles.orderRefText}># BOOKING REF: {booking.reference}</Text>
        </View>
      </View>

      {/* Dispatch / arrival information from the scheduled window (no live ETA) */}
      {arrival ? (
        <View style={styles.dispatchCard} accessible accessibilityLabel={`${arrival.title}: ${arrival.value}. ${arrival.detail}`}>
          <View style={styles.dispatchIconTile}>
            <Ionicons name={confirmed ? 'flash' : 'hourglass-outline'} size={20} color="#00513A" />
          </View>
          <View style={styles.dispatchTextWrap}>
            <View style={styles.dispatchTitleRow}>
              <Text style={styles.dispatchTitle}>{arrival.title.toUpperCase()}</Text>
              <View style={styles.greenDot} />
            </View>
            <Text style={styles.dispatchDesc}>{arrival.value}</Text>
            <Text style={styles.dispatchDesc}>{arrival.detail}</Text>
          </View>
        </View>
      ) : null}

      <CCard style={styles.receiptCard}>
        <View style={styles.receiptHeader}>
          <Text style={styles.receiptTitle}>SERVICE RECEIPT</Text>
          <View style={[styles.ratePill, { backgroundColor: status.bg }]} accessibilityLabel={`Status: ${status.label}`}>
            <Text style={[styles.ratePillText, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.providerRow}>
          <CustomerAvatar imageUrl={photoUri(booking.provider.avatarUrl)} name={booking.provider.name} size={54} shape="circle" ring tint={tone.tint} bg={tone.bg} />
          <View style={styles.providerInfo}>
            <Text style={styles.providerLabel}>PROVIDER</Text>
            <Text style={styles.providerName}>{booking.provider.name}</Text>
            <Text style={styles.reviewCount} numberOfLines={1}>
              {booking.provider.headline}
            </Text>
          </View>
          {/* The provider's phone is shared only after they confirm (NFR5). */}
          {booking.provider.phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${booking.provider.phone}`)}
              style={styles.callCircle}
              accessibilityRole="button"
              accessibilityLabel={`Call ${booking.provider.name}`}
            >
              <Ionicons name="call-outline" size={19} color={cc.primary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.serviceBox}>
          <View style={styles.serviceIconTile}>
            <MaterialCommunityIcons name={tone.icon} size={20} color={cc.primary} />
          </View>
          <View style={styles.serviceTextWrap}>
            <Text style={styles.serviceLabel}>SERVICE</Text>
            <Text style={styles.serviceName}>{booking.service.name}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color={cc.primary} style={styles.detailIcon} />
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>DATE &amp; TIME</Text>
            <Text style={styles.detailVal}>
              {formatBookingDate(booking.scheduledDate)} • {formatTimeSlot(booking.timeSlot).split(' – ')[0]}
            </Text>
            <Text style={styles.detailSub}>Arrival window: {formatTimeSlot(booking.timeSlot)}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color={cc.amber} style={styles.detailIcon} />
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>ADDRESS</Text>
            <Text style={styles.detailVal}>
              {booking.address.street}, {booking.address.city}
            </Text>
            {booking.address.landmark ? <Text style={styles.detailSub}>Landmark: {booking.address.landmark}</Text> : null}
          </View>
        </View>

        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{booking.service.name}</Text>
            <Text style={styles.priceVal}>{formatLKR(booking.pricing.servicePrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service Visiting Fee</Text>
            <Text style={styles.priceVal}>
              {booking.pricing.visitFee > 0 ? formatLKR(booking.pricing.visitFee) : 'Free'}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <View style={styles.totalLeft}>
              <Text style={styles.totalLabel}>ESTIMATED TOTAL</Text>
              <Text style={styles.paySub}>Pay cash on completion</Text>
            </View>
            <Text style={styles.totalAmount}>{formatLKR(booking.pricing.total)}</Text>
          </View>
        </View>
      </CCard>

      {booking.canModify ? (
        <View style={styles.modifyRow}>
          <Ionicons name="help-circle-outline" size={18} color={cc.amber} />
          <Text style={styles.modifyText}>Need to reschedule or add instructions?</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/customer/book-service', params: { bookingId: booking.id } })}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Modify booking"
          >
            <Text style={styles.modifyLink}>Modify</Text>
          </Pressable>
        </View>
      ) : null}

      <CustomerButton
        title="TRACK BOOKING"
        icon="arrow-forward"
        large
        onPress={() => router.replace({ pathname: '/customer/track-booking', params: { id: booking.id } })}
      />
      <Pressable onPress={goHome} hitSlop={10} style={styles.returnHomeBtn} accessibilityRole="button">
        <Text style={styles.returnHomeText}>Return to Home</Text>
      </Pressable>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 4, paddingBottom: 28, gap: 14 },
  topCloseRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -4 },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: cc.containerHigh,
    borderRadius: cr.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  closeBtnText: { fontFamily: cf.semibold, fontSize: 12, color: cc.text },
  hero: { alignItems: 'center', gap: 6, marginTop: -4 },
  haloRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 168, 107, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  checkCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#007A4D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007A4D',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  amberDot: {
    position: 'absolute',
    top: 8,
    right: 14,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#8C5600',
  },
  heroTitle: { fontFamily: cf.heading, fontSize: 25, color: cc.text, textAlign: 'center' },
  heroSubtitle: {
    fontFamily: cf.body,
    fontSize: 14,
    color: cc.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  orderRefPill: {
    backgroundColor: cc.containerHigh,
    borderRadius: cr.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  orderRefText: { fontFamily: cf.semibold, fontSize: 12, color: cc.text, letterSpacing: 0.6 },
  dispatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cc.container,
    borderRadius: cr.lg,
    padding: 14,
  },
  dispatchIconTile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6FFBBE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchTextWrap: { flex: 1, gap: 2 },
  dispatchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dispatchTitle: { fontFamily: cf.bold, fontSize: 11, color: '#00513A', letterSpacing: 0.8 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00A86B' },
  dispatchDesc: { fontFamily: cf.medium, fontSize: 12, lineHeight: 17, color: cc.text },
  receiptCard: { padding: 16, gap: 14 },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  receiptTitle: { fontFamily: cf.semibold, fontSize: 12, color: cc.textMuted, letterSpacing: 0.8 },
  ratePill: {
    backgroundColor: cc.containerHigh,
    borderRadius: cr.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratePillText: { fontFamily: cf.semibold, fontSize: 11, color: cc.primary },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerInfo: { flex: 1, gap: 2 },
  providerLabel: { fontFamily: cf.semibold, fontSize: 10, color: cc.textMuted, letterSpacing: 0.6 },
  providerName: { fontFamily: cf.headingSemi, fontSize: 16, color: cc.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontFamily: cf.bold, fontSize: 12, color: cc.text },
  reviewCount: { fontFamily: cf.body, fontSize: 11, color: cc.textMuted },
  callCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: cc.containerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    padding: 10,
  },
  serviceIconTile: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: cc.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTextWrap: { flex: 1, gap: 1 },
  serviceLabel: { fontFamily: cf.semibold, fontSize: 10, color: cc.textMuted, letterSpacing: 0.6 },
  serviceName: { fontFamily: cf.headingSemi, fontSize: 14, color: cc.text },
  qtyText: { fontFamily: cf.medium, fontSize: 12, color: cc.textMuted },
  detailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  detailIcon: { marginTop: 2 },
  detailTextWrap: { flex: 1, gap: 1 },
  detailLabel: { fontFamily: cf.semibold, fontSize: 10, color: cc.textMuted, letterSpacing: 0.6 },
  detailVal: { fontFamily: cf.semibold, fontSize: 14, color: cc.text },
  detailSub: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  priceSection: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: cc.outlineSoft },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  priceVal: { fontFamily: cf.medium, fontSize: 13, color: cc.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    marginTop: 2,
  },
  totalLeft: { gap: 1 },
  totalLabel: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.6 },
  paySub: { fontFamily: cf.medium, fontSize: 11, color: cc.success },
  totalAmount: { fontFamily: cf.heading, fontSize: 20, color: '#006194' },
  modifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: cc.container,
    borderRadius: cr.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modifyText: { flex: 1, fontFamily: cf.body, fontSize: 13, color: cc.text },
  modifyLink: { fontFamily: cf.bold, fontSize: 13, color: cc.primary },
  returnHomeBtn: { alignItems: 'center', paddingVertical: 6 },
  returnHomeText: { fontFamily: cf.semibold, fontSize: 14, color: cc.primary },
});
