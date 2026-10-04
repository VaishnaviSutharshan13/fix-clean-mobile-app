import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Avatar from '../../components/Avatar';
import BookingSummary from '../../components/BookingSummary';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import Screen from '../../components/Screen';
import StateView from '../../components/StateView';
import StatusBadge from '../../components/StatusBadge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { bookingService } from '../../services/bookingService';
import { getFriendlyErrorMessage } from '../../utils/helpers';

const goHome = () => router.replace('/customer/home');

// Booking Confirmation (Milestone 02, Variant B): clear post-booking feedback
// with the reference, provider, schedule, price and a prominent Track action.
// The booking is "requested" until the provider accepts it (FR3/FR4), so the
// screen says so instead of claiming it is already confirmed.
export default function BookingConfirmation() {
  const { id, updated } = useLocalSearchParams<{ id: string; updated?: string }>();
  const { data: booking, error, loading, reload } = useAsync(() => bookingService.getMine(id), [id]);

  if (loading && !booking) return <Loading message="Loading your booking…" />;
  if (error || !booking) {
    return (
      <Screen header={<Header title="Booking" onBack={goHome} />}>
        <StateView
          title="Couldn't load this booking"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </Screen>
    );
  }

  const isUpdate = updated === '1';

  return (
    <Screen
      header={<Header title="Booking Confirmation" onBack={goHome} />}
      footer={
        <>
          <Button
            title="TRACK BOOKING"
            icon="navigate-outline"
            onPress={() => router.replace({ pathname: '/customer/track-booking', params: { id: booking.id } })}
          />
          <Button title="Return to Home" variant="ghost" onPress={goHome} />
        </>
      }
    >
      <View style={styles.hero} accessibilityLiveRegion="polite">
        <View style={styles.check}>
          <Ionicons name="checkmark" size={44} color={colors.white} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {isUpdate ? 'Booking updated!' : 'Booking request sent!'}
        </Text>
        <Text style={styles.subtitle}>
          {booking.status === 'requested'
            ? `${booking.provider.name} will review your request and confirm it. You can follow every update on the tracking screen.`
            : 'Follow every update on the tracking screen.'}
        </Text>
        <View style={styles.refRow}>
          <View style={styles.refPill}>
            <Text style={styles.refText}>BOOKING REF: {booking.reference}</Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>
      </View>

      <Card title="Service receipt">
        <View style={styles.providerRow}>
          <Avatar name={booking.provider.name} size={44} />
          <View style={styles.providerText}>
            <Text style={styles.label}>PROVIDER</Text>
            <Text style={styles.providerName}>{booking.provider.name}</Text>
            <Text style={styles.muted}>{booking.provider.headline}</Text>
          </View>
        </View>
        <BookingSummary booking={booking} showProblem={false} />
      </Card>

      {booking.canModify ? (
        <Pressable
          style={styles.modify}
          onPress={() => router.push({ pathname: '/customer/book-service', params: { bookingId: booking.id } })}
          accessibilityRole="button"
          accessibilityLabel="Modify booking"
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.modifyText}>Need to reschedule or add instructions?</Text>
          <Text style={styles.modifyLink}>Modify</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  check: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.md },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  refPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  refText: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 0.4 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  providerText: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4 },
  providerName: { fontSize: 15, fontWeight: '800', color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted },
  modify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  modifyText: { flex: 1, fontSize: 13, color: colors.textMuted },
  modifyLink: { fontSize: 13, fontWeight: '800', color: colors.primary },
});
