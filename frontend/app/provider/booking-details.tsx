import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Avatar from '../../components/Avatar';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import ProviderHeader from '../../components/provider/ProviderHeader';
import StateView from '../../components/StateView';
import StatusBadge from '../../components/StatusBadge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { providerPortalService } from '../../services/providerPortalService';
import { CATEGORY_META, confirmAction, formatBookingDate, formatTimeSlot } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';

// Booking Details (Milestone 02 Variant A / Figma "Job Details"): customer,
// service and problem information before the Accept / Decline decision (FR4).
// Exact address and phone stay hidden until acceptance (NFR5).
export default function BookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, error, loading, reload } = useAsync(() => providerPortalService.job(id), [id]);
  const [busy, setBusy] = useState<'accept' | 'decline'>();
  const [actionError, setActionError] = useState<string>();

  if (loading && !job) return <Loading message="Loading job details…" />;
  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <ProviderHeader title="Job Details" showBack />
        <StateView
          title="Couldn't load this booking"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </SafeAreaView>
    );
  }

  const category = CATEGORY_META[job.service.category];

  const accept = async () => {
    setBusy('accept');
    setActionError(undefined);
    try {
      await providerPortalService.act(job.id, 'accept');
      router.replace({ pathname: '/provider/confirm-booking', params: { id: job.id } });
    } catch (err) {
      setActionError(getFriendlyErrorMessage(err, { 409: 'This booking was already updated by someone else.' }));
      setBusy(undefined);
      await reload(true);
    }
  };

  const decline = async () => {
    const ok = await confirmAction(
      'Decline request?',
      `${job.customer.name} will be told you can't take ${job.reference}.`,
      'Decline',
    );
    if (!ok) return;
    setBusy('decline');
    setActionError(undefined);
    try {
      await providerPortalService.act(job.id, 'decline');
      router.replace('/provider/booking-requests');
    } catch (err) {
      setActionError(getFriendlyErrorMessage(err, { 409: 'This booking was already updated by someone else.' }));
      setBusy(undefined);
      await reload(true);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ProviderHeader title="Job Details" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <View style={styles.specRow}>
            <Ionicons name="checkbox-outline" size={20} color={colors.primary} />
            <Text style={styles.specTitle}>Booking Specification</Text>
            <View style={styles.refChip}>
              <Text style={styles.refText}>#{job.reference}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.specSub}>Review the request before committing.</Text>
            <StatusBadge status={job.status} />
          </View>
        </View>

        {actionError ? <FormMessage message={actionError} /> : null}

        {/* Customer */}
        <View style={styles.card}>
          <View style={styles.customerRow}>
            <Avatar name={job.customer.name} size={48} />
            <View style={styles.flex}>
              <Text style={styles.customerName}>{job.customer.name}</Text>
              <Text style={styles.muted}>{job.location.city} customer</Text>
            </View>
          </View>
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={16} color={colors.textMuted} />
            <Text style={styles.phoneText}>{job.customer.phone ?? '+94 •• ••• ••••'}</Text>
            {!job.contactShared ? (
              <View style={styles.revealChip}>
                <Text style={styles.revealText}>Reveals upon accept</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Service / slot / location */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name={category.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.infoLabel}>SERVICE CATEGORY</Text>
              <Text style={styles.infoValue}>{job.service.name}</Text>
              <Text style={styles.infoSub}>{category.label}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.infoLabel}>SCHEDULED SLOT</Text>
              <Text style={styles.infoValue}>{formatBookingDate(job.scheduledDate)}</Text>
              <Text style={styles.infoSub}>Arrival window {formatTimeSlot(job.timeSlot)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="navigate-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.infoLabel}>LOCATION DETAILS</Text>
              <Text style={styles.infoValue}>
                {job.location.street ? `${job.location.street}, ${job.location.city}` : job.location.city}
              </Text>
              <Text style={styles.infoSub}>
                {job.contactShared
                  ? job.location.landmark
                    ? `Landmark: ${job.location.landmark}`
                    : 'Exact address shared with you'
                  : 'Exact address is revealed after you accept'}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer note */}
        <View style={styles.card}>
          <View style={styles.inline}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Customer Note</Text>
          </View>
          <View style={styles.noteWell}>
            <Text style={styles.noteText}>“{job.problemDescription}”</Text>
          </View>
        </View>

        {/* Payout */}
        <View style={styles.payout}>
          <Text style={styles.payoutLabel}>ESTIMATED PAYOUT</Text>
          <Text style={styles.payoutValue}>
            LKR <Text style={styles.payoutBig}>{job.pricing.total.toLocaleString('en-US')}</Text>
          </Text>
          <Text style={styles.payoutSub}>
            {formatLKR(job.pricing.servicePrice)} service + {formatLKR(job.pricing.visitFee)} visit • Cash on completion
          </Text>
        </View>
      </ScrollView>

      {/* Actions depend on the current status (server-enforced). */}
      {job.actions.accept || job.actions.decline ? (
        <View style={styles.footer}>
          <Pressable
            style={[styles.declineButton, busy && styles.disabled]}
            onPress={decline}
            disabled={!!busy}
            accessibilityRole="button"
            accessibilityLabel="Decline"
          >
            {busy === 'decline' ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <>
                <Ionicons name="close" size={18} color={colors.danger} />
                <Text style={styles.declineText}>Decline</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.acceptButton, busy && styles.disabled]}
            onPress={accept}
            disabled={!!busy}
            accessibilityRole="button"
            accessibilityLabel="Accept job"
          >
            {busy === 'accept' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.acceptText}>Accept Job</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </>
            )}
          </Pressable>
        </View>
      ) : job.contactShared && job.status !== 'completed' ? (
        <View style={styles.footer}>
          <Pressable
            style={styles.acceptButton}
            onPress={() => router.replace({ pathname: '/provider/customer-location', params: { id: job.id } })}
            accessibilityRole="button"
          >
            <Ionicons name="navigate-outline" size={20} color={colors.white} />
            <Text style={styles.acceptText}>Open Service Details</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.lavender },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  specTitle: { flex: 1, fontSize: 19, fontWeight: '600', color: colors.text },
  refChip: { backgroundColor: colors.lavenderStrong, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  refText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: spacing.sm },
  specSub: { flex: 1, fontSize: 13, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  customerName: { fontSize: 18, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lavender,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  phoneText: { flex: 1, fontSize: 14, color: colors.text },
  revealChip: { backgroundColor: colors.lavenderStrong, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  revealText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  infoRow: { flexDirection: 'row', gap: spacing.md },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5 },
  infoValue: { fontSize: 17, fontWeight: '500', color: colors.text, marginTop: 2 },
  infoSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  noteWell: { backgroundColor: colors.lavender, borderRadius: radius.md, padding: spacing.md },
  noteText: { fontSize: 14, lineHeight: 21, fontStyle: 'italic', color: colors.text },
  payout: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, gap: 2 },
  payoutLabel: { fontSize: 13, fontWeight: '600', color: '#CFE2F5', letterSpacing: 0.6 },
  payoutValue: { fontSize: 18, fontWeight: '700', color: colors.white },
  payoutBig: { fontSize: 30, fontWeight: '800' },
  payoutSub: { fontSize: 12, color: '#DCEAF7', marginTop: 4 },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  declineButton: {
    flex: 0.42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.lavenderStrong,
  },
  declineText: { fontSize: 16, fontWeight: '600', color: colors.danger },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  acceptText: { fontSize: 16, fontWeight: '600', color: colors.white },
  disabled: { opacity: 0.6 },
});
