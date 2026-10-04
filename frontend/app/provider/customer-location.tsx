import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Avatar from '../../components/Avatar';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import ProviderHeader from '../../components/provider/ProviderHeader';
import StateView from '../../components/StateView';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { providerPortalService } from '../../services/providerPortalService';
import type { ProviderJobAction } from '../../types/providerJob';
import { CATEGORY_META, confirmAction, formatBookingDate, formatTimeSlot, sriLankaToday } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';
import { jobStageLabel, mapsSearchUrl } from '../../utils/providerJob';
import { relativeDayLabel } from '../../utils/providerSchedule';

// Customer Location / Service Details (Milestone 02 Variant A / Figma
// "Live Job Tracking"). Only reachable with the exact address once the
// booking is confirmed (FR6, NFR5 — enforced by the API). There is no in-app
// GPS tracking; "Open in Maps" hands the address to the device's maps app.
export default function CustomerLocation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, error, loading, reload } = useAsync(() => providerPortalService.job(id), [id]);
  const [busy, setBusy] = useState<ProviderJobAction>();
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>();

  if (loading && !job) return <Loading message="Loading service details…" />;
  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <ProviderHeader title="Service Details" showBack />
        <StateView
          title="Couldn't load this booking"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </SafeAreaView>
    );
  }

  // NFR5: the API omits the address until the provider has accepted.
  if (!job.contactShared) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ProviderHeader title="Service Details" showBack />
        <StateView
          icon="lock-closed-outline"
          title="Customer location is locked"
          message={
            job.status === 'requested'
              ? 'The exact address and phone number are shared only after you accept this booking.'
              : 'This booking is no longer active, so the customer location is not available.'
          }
          actionLabel={job.status === 'requested' ? 'Review request' : 'Back to dashboard'}
          onAction={() =>
            job.status === 'requested'
              ? router.replace({ pathname: '/provider/booking-details', params: { id: job.id } })
              : router.replace('/provider/dashboard')
          }
        />
      </SafeAreaView>
    );
  }

  const mapsUrl = mapsSearchUrl(job);
  const today = sriLankaToday().date;
  const dayLabel = relativeDayLabel(job.scheduledDate, today) || formatBookingDate(job.scheduledDate);

  const run = async (action: ProviderJobAction) => {
    if (action === 'complete') {
      const ok = await confirmAction(
        'Mark job as completed?',
        `Confirm that ${job.service.name} for ${job.customer.name} is finished and ${formatLKR(job.pricing.total)} has been collected.`,
        'Mark completed',
      );
      if (!ok) return;
    }
    setBusy(action);
    setMessage(undefined);
    try {
      await providerPortalService.act(job.id, action);
      setMessage({
        tone: 'success',
        text:
          action === 'on-the-way'
            ? `Status updated: On the way. ${job.customer.name} can see this on their tracking screen.`
            : 'Job marked as completed. Great work!',
      });
      await reload(true);
    } catch (err) {
      setMessage({ tone: 'error', text: getFriendlyErrorMessage(err, { 409: 'This job was already updated. Refreshed.' }) });
      await reload(true);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ProviderHeader title="Service Details" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.stageChip, job.status === 'completed' && styles.stageDone]}>
            <View style={[styles.stageDot, job.status === 'completed' && { backgroundColor: colors.success }]} />
            <Text style={[styles.stageText, job.status === 'completed' && { color: colors.success }]}>
              {jobStageLabel(job)}
            </Text>
          </View>
          <View style={styles.refChip}>
            <Text style={styles.refText}>REF: #{job.reference}</Text>
          </View>
        </View>

        {message ? <FormMessage message={message.text} tone={message.tone} /> : null}

        {/* Location panel (address-based; no live GPS in this app) */}
        <View style={styles.mapPanel}>
          <View style={styles.mapPin}>
            <Ionicons name="location" size={30} color={colors.orange} />
          </View>
          <Text style={styles.mapAddress}>
            {job.location.street}, {job.location.city}
          </Text>
          {job.location.landmark ? <Text style={styles.mapLandmark}>Landmark: {job.location.landmark}</Text> : null}
          {mapsUrl ? (
            <Pressable
              style={styles.mapsButton}
              onPress={() => Linking.openURL(mapsUrl)}
              accessibilityRole="link"
              accessibilityLabel="Open address in maps"
            >
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text style={styles.mapsText}>Open in Maps</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Customer & service */}
        <View style={styles.card}>
          <View style={styles.customerRow}>
            <Avatar name={job.customer.name} size={50} />
            <View style={styles.flex}>
              <Text style={styles.customerName}>{job.customer.name}</Text>
              <View style={styles.verifiedChip}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                <Text style={styles.verifiedText}>CONFIRMED CUSTOMER</Text>
              </View>
            </View>
            <View style={styles.feeBox}>
              <Text style={styles.feeLabel}>ESTIMATED FEE</Text>
              <Text style={styles.feeValue}>LKR {job.pricing.total.toLocaleString('en-US')}</Text>
            </View>
          </View>

          <View style={styles.serviceWell}>
            <View style={styles.serviceIcon}>
              <Ionicons name={CATEGORY_META[job.service.category].icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.wellLabel}>BOOKED SERVICE</Text>
              <Text style={styles.wellValue}>{job.service.name}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color={colors.warning} />
            <View style={styles.flex}>
              <Text style={styles.detailText}>
                {job.location.street}, {job.location.city}
              </Text>
              {job.location.landmark ? <Text style={styles.detailSub}>Landmark: {job.location.landmark}</Text> : null}
            </View>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={styles.detailText}>
              Scheduled: <Text style={styles.bold}>{dayLabel} • {formatTimeSlot(job.timeSlot)}</Text>
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={18} color={colors.success} />
            <Text style={styles.detailText}>Payment: Cash on completion</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
            <Text style={styles.detailText}>{job.problemDescription}</Text>
          </View>

          {job.customer.phone ? (
            <View style={styles.contactRow}>
              <Pressable
                style={styles.contactButton}
                onPress={() => Linking.openURL(`tel:${job.customer.phone}`)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${job.customer.name}`}
              >
                <Ionicons name="call-outline" size={18} color={colors.primary} />
                <Text style={styles.contactText}>Call Client</Text>
              </Pressable>
              <Pressable
                style={styles.contactButton}
                onPress={() => Linking.openURL(`sms:${job.customer.phone}`)}
                accessibilityRole="button"
                accessibilityLabel={`Send SMS to ${job.customer.name}`}
              >
                <Ionicons name="chatbox-outline" size={18} color={colors.primary} />
                <Text style={styles.contactText}>Send SMS</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Job progression (server-enforced) */}
        {job.actions.startTrip ? (
          <Pressable
            style={[styles.primaryAction, !!busy && styles.disabled]}
            onPress={() => run('on-the-way')}
            disabled={!!busy}
            accessibilityRole="button"
            accessibilityLabel="Start trip, mark on the way"
          >
            {busy === 'on-the-way' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="navigate" size={20} color={colors.white} />
                <Text style={styles.primaryText}>START TRIP / MARK &apos;ON THE WAY&apos;</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </>
            )}
          </Pressable>
        ) : null}
        {job.actions.complete ? (
          <Pressable
            style={[styles.secondaryAction, !!busy && styles.disabled]}
            onPress={() => run('complete')}
            disabled={!!busy}
            accessibilityRole="button"
            accessibilityLabel="Mark job as completed"
          >
            {busy === 'complete' ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="checkmark-done-circle-outline" size={20} color={colors.warning} />
                <Text style={styles.secondaryText}>MARK AS COMPLETED</Text>
              </>
            )}
          </Pressable>
        ) : null}
        {job.status === 'completed' ? (
          <Pressable style={styles.secondaryAction} onPress={() => router.replace('/provider/dashboard')} accessibilityRole="button">
            <Ionicons name="grid-outline" size={18} color={colors.primary} />
            <Text style={styles.secondaryText}>BACK TO DASHBOARD</Text>
          </Pressable>
        ) : null}

        <View style={styles.protected}>
          <View style={styles.protectedIcon}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.protectedTitle}>Protected Service Channel</Text>
            <Text style={styles.protectedBody}>
              The customer&apos;s phone number and exact address are shared with you only for this confirmed job. Live
              GPS tracking is not available in this version.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.lavender },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  stageChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lavenderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  stageDone: { backgroundColor: colors.successSoft },
  stageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  stageText: { flexShrink: 1, fontSize: 11, fontWeight: '800', color: colors.primary },
  refChip: { backgroundColor: colors.lavenderStrong, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full },
  refText: { fontSize: 11, fontWeight: '700', color: colors.text },
  mapPanel: {
    backgroundColor: '#E6EDF8',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapPin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapAddress: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  mapLandmark: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: 4,
  },
  mapsText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  customerName: { fontSize: 18, fontWeight: '600', color: colors.text },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 3,
  },
  verifiedText: { fontSize: 10, fontWeight: '800', color: colors.success },
  feeBox: { backgroundColor: colors.lavender, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  feeLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  feeValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  serviceWell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.lavender,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.lavenderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  wellValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  detailRow: { flexDirection: 'row', gap: spacing.sm },
  detailText: { flex: 1, fontSize: 14, color: colors.text },
  detailSub: { fontSize: 12, color: colors.textMuted },
  contactRow: { flexDirection: 'row', gap: spacing.sm },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.lavenderStrong,
  },
  contactText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  primaryText: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.white },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.lavenderStrong,
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: colors.text },
  disabled: { opacity: 0.6 },
  protected: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.lavenderStrong,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  protectedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectedTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  protectedBody: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 2 },
});
