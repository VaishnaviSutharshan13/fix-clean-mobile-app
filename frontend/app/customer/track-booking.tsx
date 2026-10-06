import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import ArrivalCard from '../../components/ArrivalCard';
import Avatar from '../../components/Avatar';
import BookingSummary from '../../components/BookingSummary';
import Button from '../../components/Button';
import Card from '../../components/Card';
import FormMessage from '../../components/FormMessage';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import Screen from '../../components/Screen';
import StateView from '../../components/StateView';
import StatusBadge from '../../components/StatusBadge';
import StatusChangeBanner from '../../components/StatusChangeBanner';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { useBookingStatusNotice } from '../../hooks/useBookingStatusNotice';
import { bookingService } from '../../services/bookingService';
import { notificationService } from '../../services/notificationService';
import type { Booking, BookingStatus } from '../../types/booking';
import { confirmAction, formatBookingDate, formatDateTime, formatTimeSlot, STATUS_META } from '../../utils/display';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import { latestUnreadNotice } from '../../utils/notifications';

const POLL_INTERVAL_MS = 15_000;

const STEPS: { status: BookingStatus; label: string; pending: string }[] = [
  { status: 'requested', label: 'Requested', pending: 'Sending your request' },
  { status: 'confirmed', label: 'Confirmed', pending: 'Waiting for the provider to accept' },
  { status: 'on_the_way', label: 'On the Way', pending: 'Provider will set off before your time window' },
  { status: 'completed', label: 'Completed', pending: 'Job not finished yet' },
];

function Stepper({ booking }: { booking: Booking }) {
  const reached = new Map(booking.statusHistory.map((h) => [h.status, h.changedAt]));
  const currentIndex = STEPS.findIndex((s) => s.status === booking.status);

  return (
    <View accessibilityLabel={`Booking progress: ${STATUS_META[booking.status].label}`}>
      {STEPS.map((step, index) => {
        const at = reached.get(step.status);
        const done = !!at;
        const current = index === currentIndex;
        const last = index === STEPS.length - 1;
        return (
          <View key={step.status} style={styles.step}>
            <View style={styles.stepRail}>
              <View
                style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  current && booking.status !== 'completed' && styles.stepDotCurrent,
                ]}
              >
                {done ? <Ionicons name={current && booking.status !== 'completed' ? STATUS_META[step.status].icon : 'checkmark'} size={14} color={colors.white} /> : null}
              </View>
              {!last ? <View style={[styles.stepLine, reached.has(STEPS[index + 1]!.status) && styles.stepLineDone]} /> : null}
            </View>
            <View style={styles.stepBody}>
              <View style={styles.stepTitleRow}>
                <Text style={[styles.stepTitle, !done && styles.stepTitleTodo, current && styles.stepTitleCurrent]}>
                  {step.label}
                </Text>
                {current && booking.status !== 'completed' ? <Text style={styles.nowTag}>NOW</Text> : null}
              </View>
              <Text style={styles.stepSub}>{at ? formatDateTime(at) : step.pending}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Track Booking (Milestone 02, Variant A): vertical progress stepper
// Requested → Confirmed → On the Way → Completed (FR3). Refreshes
// automatically while open; status changes made by the provider trigger an
// in-app notification and update the stepper immediately.
// Notification Management: the banner shows the customer's stored, unread
// notification for this booking (so updates made while the app was closed
// still appear); dismissing it marks it as read on the server.
export default function TrackBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, error, loading, refreshing, reload } = useAsync(() => bookingService.getMine(id), [id]);
  const [actionError, setActionError] = useState<string>();
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [cancelling, setCancelling] = useState(false);
  // FR3: in-app notification when the provider changes the booking status.
  const { notice, dismiss, markSeen } = useBookingStatusNotice(booking);
  const { data: notifications, reload: reloadNotifications } = useAsync(
    () => notificationService.listMine(id),
    [id],
  );
  // Dismissed on this screen; hidden straight away while the server is updated.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const stored = latestUnreadNotice(
    (notifications?.items ?? []).filter((n) => n.bookingId === id),
    hiddenIds,
  );
  // Falls back to the live polling notice if the stored one isn't available.
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

  // The screen can be reused for another booking (e.g. a deep link): drop
  // feedback messages that belonged to the previous one.
  useEffect(() => {
    setActionError(undefined);
    setActionSuccess(undefined);
    setHiddenIds(new Set());
  }, [id]);

  // Poll only while this screen is focused.
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
      <Screen header={<Header title="Track Booking" />}>
        <StateView
          title="Couldn't load this booking"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </Screen>
    );
  }

  const ended = booking.status === 'cancelled' || booking.status === 'declined';

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
      // The customer made this change, so don't raise a "status changed" notice for it.
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

  return (
    <Screen
      header={<Header title="Track Booking" onBack={() => (router.canGoBack() ? router.back() : router.replace('/customer/home'))} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void reloadNotifications(true);
            void reload(true);
          }}
        />
      }
    >
      {shownNotice ? <StatusChangeBanner notice={shownNotice} onDismiss={dismissNotice} /> : null}

      {/* Provider */}
      <Card>
        <View style={styles.providerRow}>
          <Avatar name={booking.provider.name} size={52} />
          <View style={styles.providerText}>
            <Text style={styles.providerName}>{booking.provider.name}</Text>
            <Text style={styles.muted}>{booking.provider.headline}</Text>
            {!booking.provider.phone && !ended ? (
              <Text style={styles.hint}>Contact details appear once the provider confirms.</Text>
            ) : null}
          </View>
          {booking.provider.phone ? (
            <Pressable
              style={styles.callButton}
              onPress={() => Linking.openURL(`tel:${booking.provider.phone}`)}
              accessibilityRole="button"
              accessibilityLabel={`Call ${booking.provider.name}`}
            >
              <Ionicons name="call" size={20} color={colors.white} />
            </Pressable>
          ) : null}
        </View>
      </Card>

      {error ? <FormMessage message="Couldn't refresh the latest status. Pull down to try again." /> : null}
      {actionError ? <FormMessage message={actionError} /> : null}
      {actionSuccess ? <FormMessage message={actionSuccess} tone="success" /> : null}

      {/* Status */}
      <Card
        title="Booking status"
        right={<Text style={styles.ref}>{booking.reference}</Text>}
      >
        <Text style={styles.muted}>
          Service date: {formatBookingDate(booking.scheduledDate)}, {formatTimeSlot(booking.timeSlot)}
        </Text>
        {ended ? (
          <View style={styles.ended}>
            <StatusBadge status={booking.status} />
            <Text style={styles.endedText}>
              {booking.status === 'cancelled'
                ? 'You cancelled this booking.'
                : `${booking.provider.name} couldn't take this booking. Please choose another provider.`}
            </Text>
            {booking.cancellationReason ? <Text style={styles.muted}>Reason: {booking.cancellationReason}</Text> : null}
            <Button title="Find another provider" variant="secondary" onPress={() => router.replace('/customer/provider-list')} />
          </View>
        ) : (
          <>
            <ArrivalCard booking={booking} />
            <Stepper booking={booking} />
          </>
        )}
        {!ended && booking.status !== 'completed' ? (
          <View style={styles.autoRefresh}>
            <Ionicons name="sync-outline" size={13} color={colors.textMuted} />
            <Text style={styles.hint}>Updates automatically every 15 seconds</Text>
          </View>
        ) : null}
      </Card>

      <Card title="Booking details">
        <BookingSummary booking={booking} />
      </Card>

      {booking.canModify || booking.canCancel ? (
        <View style={styles.actions}>
          {booking.canModify ? (
            <Button
              title="Modify"
              variant="secondary"
              icon="create-outline"
              onPress={() => router.push({ pathname: '/customer/book-service', params: { bookingId: booking.id } })}
              style={styles.actionButton}
            />
          ) : null}
          {booking.canCancel ? (
            <Button
              title="Cancel Booking"
              variant="danger"
              icon="close-circle-outline"
              onPress={handleCancel}
              loading={cancelling}
              style={styles.actionButton}
            />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  providerText: { flex: 1, gap: 2 },
  providerName: { fontSize: 16, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  hint: { fontSize: 11, color: colors.textMuted },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ref: { fontSize: 12, fontWeight: '800', color: colors.primary },
  step: { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center', width: 26 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepDotCurrent: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepLine: { flex: 1, width: 2, minHeight: 28, backgroundColor: colors.border },
  stepLineDone: { backgroundColor: colors.success },
  stepBody: { flex: 1, paddingBottom: spacing.lg },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  stepTitleTodo: { color: colors.textSubtle },
  stepTitleCurrent: { color: colors.primary },
  nowTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warning,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  stepSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  ended: { gap: spacing.sm },
  endedText: { fontSize: 14, color: colors.text },
  autoRefresh: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
});
