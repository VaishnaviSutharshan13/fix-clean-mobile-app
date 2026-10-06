import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import StatusChangeBanner from '../../components/StatusChangeBanner';
import CustomerAvatar from '../../components/customer/CustomerAvatar';
import { CustomerHeader } from '../../components/customer/CustomerHeader';
import ArrivalCard from '../../components/ArrivalCard';
import BookingSummary from '../../components/BookingSummary';
import CustomerButton from '../../components/customer/CustomerButton';
import { CCard } from '../../components/customer/CustomerPrimitives';
import CustomerScreen from '../../components/customer/CustomerScreen';
import { CATEGORY_TONE, cc, cf, cr } from '../../constants/customerTheme';
import { useAsync } from '../../hooks/useAsync';
import { useBookingStatusNotice } from '../../hooks/useBookingStatusNotice';
import { bookingService } from '../../services/bookingService';
import { notificationService } from '../../services/notificationService';
import type { Booking, BookingStatus } from '../../types/booking';
import { confirmAction, formatBookingDate, formatDateTime, formatTimeSlot, STATUS_META } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';
import { latestUnreadNotice } from '../../utils/notifications';
import { photoUri } from '../../services/userService';

const POLL_INTERVAL_MS = 15_000;

const goHome = () => (router.canGoBack() ? router.back() : router.replace('/customer/home'));

const STEPS: { status: BookingStatus; label: string; pending: string }[] = [
  { status: 'requested', label: 'Requested', pending: 'Sending your request' },
  { status: 'confirmed', label: 'Confirmed', pending: 'Waiting for the provider to accept' },
  { status: 'on_the_way', label: 'On the Way', pending: 'Provider will set off before your time window' },
  { status: 'completed', label: 'Completed', pending: 'Job not finished yet' },
];

function Stepper({ booking }: { booking: Booking }) {
  const reached = new Map(booking.statusHistory.map((h) => [h.status, h.changedAt]));
  const currentIndex = STEPS.findIndex((s) => s.status === booking.status);
  const finished = booking.status === 'completed';

  return (
    <View accessibilityLabel={`Booking progress: ${STATUS_META[booking.status].label}`}>
      {STEPS.map((step, index) => {
        const at = reached.get(step.status);
        const done = !!at;
        const current = index === currentIndex && !finished;
        const last = index === STEPS.length - 1;
        const nextReached = !last && reached.has(STEPS[index + 1]!.status);

        return (
          <View key={step.status} style={styles.step}>
            <View style={styles.stepRail}>
              <View
                style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  current && styles.stepDotCurrent,
                  !done && !current && styles.stepDotTodo,
                ]}
              >
                {current ? (
                  <Ionicons name={STATUS_META[step.status].icon} size={14} color="#FFFFFF" />
                ) : done ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                  <View style={styles.stepDotHole} />
                )}
              </View>
              {!last ? (
                <View style={[styles.stepLine, nextReached && styles.stepLineDone]} />
              ) : null}
            </View>

            <View style={styles.stepBody}>
              <View style={styles.stepTitleRow}>
                <Text
                  style={[
                    styles.stepTitle,
                    !done && !current && styles.stepTitleTodo,
                    current && styles.stepTitleCurrent,
                  ]}
                >
                  {step.label}
                </Text>
                {current ? (
                  <View style={styles.etaBadge}>
                    <Text style={styles.etaBadgeText}>NOW</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.stepSub}>
                {at
                  ? formatDateTime(at)
                  : step.status === 'completed'
                    ? `${step.pending} • Cash payment: ${formatLKR(booking.pricing.total)}`
                    : step.pending}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Track Booking (reference: order.jpeg) with real data: status banner (stored
// notifications, marked read on dismiss, with the polling notice as fallback),
// arrival information, provider, status timeline, payment, booking details and
// Modify / Cancel while allowed. Refreshes every 15 seconds while focused.
export default function TrackBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, error, loading, refreshing, reload } = useAsync(() => bookingService.getMine(id), [id]);
  const [actionError, setActionError] = useState<string>();
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [cancelling, setCancelling] = useState(false);

  const { notice, dismiss, markSeen } = useBookingStatusNotice(booking);
  const { data: notifications, reload: reloadNotifications } = useAsync(
    () => notificationService.listMine(id),
    [id],
  );

  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const stored = latestUnreadNotice(
    (notifications?.items ?? []).filter((n) => n.bookingId === id),
    hiddenIds,
  );
  const shownNotice = stored ?? notice;

  const dismissNotice = () => {
    dismiss();
    if (!stored) return;
    const ids = stored.ids;
    setHiddenIds((prev) => new Set([...prev, ...ids]));
    void Promise.allSettled(ids.map((nid) => notificationService.markRead(nid))).then(() =>
      reloadNotifications(true),
    );
  };

  useEffect(() => {
    setActionError(undefined);
    setActionSuccess(undefined);
    setHiddenIds(new Set());
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => {
        void reload(true);
        void reloadNotifications(true);
      }, POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [reload, reloadNotifications]),
  );

  if (loading && !booking) return <Loading message="Loading booking status…" />;
  if (!booking) {
    return (
      <CustomerScreen header={<CustomerHeader title="Track Booking" onBack={goHome} />}>
        <StateView
          title="Couldn't load booking tracker"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </CustomerScreen>
    );
  }

  const ended = booking.status === 'cancelled' || booking.status === 'declined';
  const tone = CATEGORY_TONE[booking.service.category];

  const handleCancel = async () => {
    const ok = await confirmAction(
      'Cancel booking?',
      `This will cancel booking ${booking.reference} with ${booking.provider.name}.`,
      'Cancel booking',
    );
    if (!ok) return;
    setCancelling(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    try {
      const updated = await bookingService.cancel(booking.id);
      markSeen(updated.id, updated.status);
      setActionSuccess(`Booking ${updated.reference} has been cancelled.`);
      await reload(true);
    } catch (err) {
      setActionError(getFriendlyErrorMessage(err, { 409: 'This booking can no longer be cancelled.' }));
      await reload(true);
    } finally {
      setCancelling(false);
    }
  };

  const live = !ended && booking.status !== 'completed';

  return (
    <CustomerScreen
      header={<CustomerHeader title="Track Booking" onBack={goHome} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void reloadNotifications(true);
            void reload(true);
          }}
        />
      }
      contentStyle={styles.content}
    >
      {/* SubNav: < Home and a LIVE pill while the booking is in progress (status polling) */}
      <View style={styles.subNavRow}>
        <Pressable
          onPress={() => router.replace('/customer/home')}
          style={styles.homeBackBtn}
          accessibilityRole="button"
          accessibilityLabel="Home"
        >
          <Ionicons name="chevron-back" size={18} color={cc.primary} />
          <Text style={styles.homeBackText}>Home</Text>
        </Pressable>
        {live ? (
          <View style={styles.liveBadgePill} accessibilityLabel="Status updates automatically every 15 seconds">
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        ) : null}
      </View>

      {shownNotice ? <StatusChangeBanner notice={shownNotice} onDismiss={dismissNotice} /> : null}

      {/* Arrival information from the scheduled window (there is no live GPS) */}
      {!ended ? <ArrivalCard booking={booking} /> : null}

      <CCard style={styles.providerCard}>
        <CustomerAvatar imageUrl={photoUri(booking.provider.avatarUrl)} name={booking.provider.name} size={58} shape="circle" ring tint={tone.tint} bg={tone.bg} />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName} numberOfLines={1}>
            {booking.provider.name}
          </Text>
          <Text style={styles.providerSub} numberOfLines={1}>
            {booking.provider.headline}
          </Text>
          <Text style={styles.verifiedLeadText}>
            {booking.provider.phone
              ? `Phone shared • ${booking.provider.serviceArea}`
              : ended
                ? booking.provider.serviceArea
                : 'Contact details appear once the provider confirms'}
          </Text>
        </View>
        {/* The provider's phone is shared only after they confirm (NFR5). */}
        {booking.provider.phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${booking.provider.phone}`)}
            style={styles.callCircleBtn}
            accessibilityRole="button"
            accessibilityLabel={`Call ${booking.provider.name}`}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </CCard>

      {error ? <FormMessage message="Couldn't refresh the latest status. Pull down to try again." /> : null}
      {actionError ? <FormMessage message={actionError} /> : null}
      {actionSuccess ? <FormMessage message={actionSuccess} tone="success" /> : null}

      <CCard style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusHeaderLeft}>
            <Text style={styles.statusHeaderLabel}>BOOKING STATUS</Text>
            <Text style={styles.statusHeaderDate}>
              Service Date: {formatBookingDate(booking.scheduledDate)}, {formatTimeSlot(booking.timeSlot).split(' – ')[0]}
            </Text>
          </View>
          <View style={styles.idChip}>
            <Text style={styles.idText}>ID #{booking.reference}</Text>
          </View>
        </View>

        {ended ? (
          <View style={styles.ended}>
            <View style={[styles.endedBadge, { backgroundColor: STATUS_META[booking.status].bg }]}>
              <Ionicons name={STATUS_META[booking.status].icon} size={15} color={STATUS_META[booking.status].fg} />
              <Text style={[styles.endedBadgeText, { color: STATUS_META[booking.status].fg }]}>
                {STATUS_META[booking.status].label}
              </Text>
            </View>
            <Text style={styles.endedText}>
              {booking.status === 'cancelled'
                ? 'You cancelled this booking.'
                : `${booking.provider.name} couldn't take this booking. Please choose another provider.`}
            </Text>
            {booking.cancellationReason ? (
              <Text style={styles.statusHeaderDate}>Reason: {booking.cancellationReason}</Text>
            ) : null}
            <CustomerButton
              title="Find another provider"
              variant="soft"
              onPress={() => router.replace('/customer/provider-list')}
            />
          </View>
        ) : (
          <Stepper booking={booking} />
        )}
        {live ? (
          <View style={styles.autoRefreshRow}>
            <Ionicons name="sync-outline" size={13} color={cc.textMuted} />
            <Text style={styles.statusHeaderDate}>Updates automatically every 15 seconds</Text>
          </View>
        ) : null}
      </CCard>

      <View style={styles.payCard}>
        <View style={styles.shieldIconCircle}>
          <Ionicons name="shield-checkmark" size={20} color={cc.primary} />
        </View>
        <View style={styles.payInfo}>
          <Text style={styles.payTitle}>Cash on Service</Text>
          <Text style={styles.paySub}>Pay the provider after the job is done</Text>
        </View>
        <Text style={styles.payAmount}>{formatLKR(booking.pricing.total)}</Text>
      </View>

      <CCard style={styles.detailsCard}>
        <Text style={styles.statusHeaderLabel}>BOOKING DETAILS</Text>
        <BookingSummary booking={booking} />
      </CCard>

      {booking.canModify || booking.canCancel ? (
        <View style={styles.actionsRow}>
          {booking.canModify ? (
            <Pressable
              onPress={() => router.push({ pathname: '/customer/book-service', params: { bookingId: booking.id } })}
              style={styles.helpBtn}
              accessibilityRole="button"
              accessibilityLabel="Modify booking"
            >
              <Ionicons name="create-outline" size={18} color={cc.primary} />
              <Text style={styles.helpBtnText}>Modify</Text>
            </Pressable>
          ) : null}
          {booking.canCancel ? (
            <Pressable
              onPress={handleCancel}
              disabled={cancelling}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel Booking"
              accessibilityState={{ busy: cancelling }}
            >
              <Ionicons name="close-circle-outline" size={18} color={cc.cancelText} />
              <Text style={styles.cancelBtnText}>{cancelling ? 'Cancelling…' : 'Cancel Booking'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 4, paddingBottom: 28, gap: 14 },
  subNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    minHeight: 28,
  },
  homeBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  homeBackText: { fontFamily: cf.semibold, fontSize: 15, color: cc.primary },
  liveBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DDF7E8',
    borderRadius: cr.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  livePulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00875A' },
  liveBadgeText: { fontFamily: cf.bold, fontSize: 11, color: '#00875A', letterSpacing: 0.8 },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  providerInfo: { flex: 1, minWidth: 0, gap: 2 },
  nameStarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  providerName: { fontFamily: cf.headingSemi, fontSize: 16, color: cc.text },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: cc.amberSoft,
    borderRadius: cr.sm - 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  starText: { fontFamily: cf.bold, fontSize: 11, color: cc.amber },
  providerSub: { fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  verifiedLeadText: { fontFamily: cf.semibold, fontSize: 12, color: cc.success },
  callCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cc.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: { padding: 16, gap: 16 },
  statusHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  statusHeaderLeft: { flex: 1, minWidth: 0, gap: 2 },
  statusHeaderLabel: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.8 },
  statusHeaderDate: { fontFamily: cf.body, fontSize: 13, color: cc.text },
  idChip: {
    backgroundColor: cc.containerHigh,
    borderRadius: cr.sm - 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  idText: { fontFamily: cf.semibold, fontSize: 12, color: cc.text },
  step: { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center', width: 28 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: '#007A4D' },
  stepDotCurrent: { backgroundColor: cc.primary },
  stepDotTodo: { borderWidth: 2, borderColor: cc.outlineSoft, backgroundColor: cc.containerHigh },
  stepDotHole: { width: 10, height: 10, borderRadius: 5, backgroundColor: cc.containerLow },
  stepLine: { width: 2, minHeight: 32, backgroundColor: cc.outlineSoft },
  stepLineDone: { backgroundColor: '#007A4D' },
  stepBody: { flex: 1, paddingBottom: 16 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepTitle: { fontFamily: cf.headingSemi, fontSize: 15, color: cc.text },
  stepTitleTodo: { color: cc.textSubtle },
  stepTitleCurrent: { color: cc.primary },
  etaBadge: {
    backgroundColor: '#E58A00',
    borderRadius: cr.sm - 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  etaBadgeText: { fontFamily: cf.bold, fontSize: 11, color: '#FFFFFF' },
  stepSub: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted, marginTop: 2 },
  ended: { gap: 10, paddingVertical: 8 },
  endedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: cr.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  endedBadgeText: { fontFamily: cf.semibold, fontSize: 12 },
  endedText: { fontFamily: cf.body, fontSize: 14, color: cc.text },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cc.container,
    borderRadius: cr.lg,
    padding: 14,
  },
  shieldIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cc.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payInfo: { flex: 1, gap: 2 },
  payTitle: { fontFamily: cf.headingSemi, fontSize: 14, color: cc.text },
  paySub: { fontFamily: cf.body, fontSize: 11, color: cc.textMuted },
  payAmount: { fontFamily: cf.heading, fontSize: 18, color: cc.primary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  helpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EAEFFF',
    borderRadius: cr.md,
    minHeight: 48,
  },
  helpBtnText: { fontFamily: cf.semibold, fontSize: 14, color: cc.primary },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FDEEEC',
    borderRadius: cr.md,
    minHeight: 48,
  },
  cancelBtnText: { fontFamily: cf.semibold, fontSize: 14, color: cc.cancelText },
  autoRefreshRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsCard: { gap: 14 },
});
