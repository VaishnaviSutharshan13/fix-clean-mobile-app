import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Avatar from '../../components/Avatar';
import Loading from '../../components/Loading';
import ProviderHeader from '../../components/provider/ProviderHeader';
import StateView from '../../components/StateView';
import StatusBadge from '../../components/StatusBadge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { providerPortalService } from '../../services/providerPortalService';
import { CATEGORY_META, formatBookingDate, formatTimeSlot, sriLankaToday } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';
import { relativeDayLabel } from '../../utils/providerSchedule';

const goDashboard = () => router.replace('/provider/dashboard');

// Accept / Confirm Booking (Milestone 02 Variant B / Figma "Booking Accepted!"):
// confirms the acceptance and unlocks the customer's contact and address
// (FR4, FR6), linking to the Customer Location / Service Details screen.
export default function ConfirmBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, error, loading, reload } = useAsync(() => providerPortalService.job(id), [id]);

  if (loading && !job) return <Loading message="Loading work order…" />;
  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <ProviderHeader title="Schedule" showBack />
        <StateView
          title="Couldn't load this booking"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </SafeAreaView>
    );
  }

  const confirmed = job.status === 'confirmed';
  const today = sriLankaToday().date;
  const dayLabel = relativeDayLabel(job.scheduledDate, today) || formatBookingDate(job.scheduledDate, false);
  const start = formatTimeSlot(job.timeSlot).split(' – ')[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ProviderHeader title="Schedule" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero} accessibilityLiveRegion="polite">
          <View style={styles.check}>
            <Ionicons name="checkmark" size={40} color={colors.white} />
          </View>
          <View style={styles.syncChip}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Customer notified in the app</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {confirmed ? 'Booking Accepted!' : 'Work Order'}
          </Text>
          <Text style={styles.subtitle}>
            Work order <Text style={styles.ref}>#{job.reference}</Text> • {confirmed ? 'Confirmed with customer' : 'Current status below'}
          </Text>
          {!confirmed ? <StatusBadge status={job.status} /> : null}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <View style={styles.statHead}>
              <Ionicons name="time-outline" size={14} color={colors.text} />
              <Text style={styles.statLabel}>SLOT</Text>
            </View>
            <Text style={styles.statValue}>{start}</Text>
            <Text style={styles.statSub}>Arrival window</Text>
          </View>
          <View style={styles.stat}>
            <View style={styles.statHead}>
              <Ionicons name="calendar-outline" size={14} color={colors.text} />
              <Text style={styles.statLabel}>DATE</Text>
            </View>
            <Text style={styles.statValue}>{dayLabel}</Text>
            <Text style={styles.statSub}>{formatBookingDate(job.scheduledDate, false)}</Text>
          </View>
          <View style={styles.stat}>
            <View style={styles.statHead}>
              <Ionicons name="location-outline" size={14} color={colors.text} />
              <Text style={styles.statLabel}>AREA</Text>
            </View>
            <Text style={styles.statValue} numberOfLines={1}>
              {job.location.city}
            </Text>
            <Text style={styles.statSub}>Service area</Text>
          </View>
        </View>

        <View style={styles.docket}>
          <View style={styles.docketHeader}>
            <Ionicons name="document-text-outline" size={18} color={colors.text} />
            <Text style={styles.docketTitle}>OFFICIAL WORK ORDER</Text>
            <View style={styles.confirmedPill}>
              <Text style={styles.confirmedText}>{job.status.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.docketBody}>
            <View style={styles.customerRow}>
              <Avatar name={job.customer.name} size={46} />
              <Text style={styles.customerName}>{job.customer.name}</Text>
            </View>

            <View style={styles.well}>
              <Text style={styles.wellLabel}>Requested Service</Text>
              <View style={styles.inline}>
                <Ionicons name={CATEGORY_META[job.service.category].icon} size={16} color={colors.primary} />
                <Text style={styles.wellValue}>{job.service.name}</Text>
              </View>
              <Text style={styles.wellSub} numberOfLines={3}>
                {job.problemDescription}
              </Text>
            </View>

            <View style={styles.twoCol}>
              <View style={[styles.well, styles.flex]}>
                <Text style={styles.wellLabel}>Scheduled Date</Text>
                <Text style={styles.wellValue}>{formatBookingDate(job.scheduledDate)}</Text>
              </View>
              <View style={[styles.well, styles.flex]}>
                <Text style={styles.wellLabel}>Time Slot</Text>
                <Text style={styles.wellValue}>{formatTimeSlot(job.timeSlot)}</Text>
              </View>
            </View>

            {job.customer.phone ? (
              <View style={styles.contact}>
                <Ionicons name="lock-open-outline" size={22} color={colors.success} />
                <View style={styles.flex}>
                  <Text style={styles.contactLabel}>DIRECT CONTACT UNLOCKED</Text>
                  <Text style={styles.contactPhone}>{job.customer.phone}</Text>
                </View>
                <Pressable
                  style={styles.callChip}
                  onPress={() => Linking.openURL(`tel:${job.customer.phone}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${job.customer.name}`}
                >
                  <Ionicons name="call" size={14} color={colors.white} />
                  <Text style={styles.callChipText}>Call</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.well}>
              <View style={styles.feeRow}>
                <Text style={styles.wellLabel}>Agreed Service Fee</Text>
                <Text style={styles.cashLabel}>Cash on completion</Text>
              </View>
              <Text style={styles.fee}>{formatLKR(job.pricing.total)}</Text>
              <Text style={styles.wellSub}>
                {formatLKR(job.pricing.servicePrice)} service + {formatLKR(job.pricing.visitFee)} visiting fee
              </Text>
            </View>

            {job.location.street ? (
              <View style={styles.addressRow}>
                <Ionicons name="location" size={18} color={colors.danger} />
                <View style={styles.flex}>
                  <Text style={styles.wellLabel}>Service Address</Text>
                  <Text style={styles.wellValue}>
                    {job.location.street}, {job.location.city}
                  </Text>
                  {job.location.landmark ? <Text style={styles.wellSub}>{job.location.landmark}</Text> : null}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {job.contactShared && job.status !== 'completed' ? (
          <Pressable
            style={({ pressed }) => [styles.routeButton, pressed && { opacity: 0.9 }]}
            onPress={() => router.replace({ pathname: '/provider/customer-location', params: { id: job.id } })}
            accessibilityRole="button"
          >
            <Ionicons name="navigate-outline" size={20} color="#9DB8FF" />
            <Text style={styles.routeText}>VIEW SERVICE DETAILS</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </Pressable>
        ) : null}

        {job.customer.phone ? (
          <Pressable
            style={styles.callRow}
            onPress={() => Linking.openURL(`tel:${job.customer.phone}`)}
            accessibilityRole="button"
          >
            <Ionicons name="call-outline" size={20} color={colors.primary} />
            <Text style={styles.callRowText}>CALL CUSTOMER DIRECTLY ({job.customer.phone})</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.returnRow} onPress={goDashboard} accessibilityRole="link">
          <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
          <Text style={styles.returnText}>Return to Provider Dashboard</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.lavender },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hero: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  check: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#14805E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  syncDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  syncText: { fontSize: 12, fontWeight: '700', color: colors.success },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  ref: { color: colors.primary, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 2 },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  statValue: { fontSize: 18, fontWeight: '600', color: colors.text },
  statSub: { fontSize: 11, color: colors.success, fontWeight: '600' },
  docket: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  docketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lavenderStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  docketTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.text },
  confirmedPill: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  confirmedText: { fontSize: 11, fontWeight: '800', color: colors.white },
  docketBody: { padding: spacing.lg, gap: spacing.md },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  customerName: { fontSize: 19, fontWeight: '600', color: colors.text },
  well: { backgroundColor: colors.lavender, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  wellLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  wellValue: { fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 },
  wellSub: { fontSize: 12, color: colors.textMuted },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  contactLabel: { fontSize: 11, fontWeight: '800', color: colors.success },
  contactPhone: { fontSize: 16, fontWeight: '700', color: colors.text },
  callChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#14805E',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  callChipText: { fontSize: 13, fontWeight: '700', color: colors.white },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cashLabel: { fontSize: 12, fontWeight: '700', color: colors.success },
  fee: { fontSize: 26, fontWeight: '700', color: colors.text },
  addressRow: { flexDirection: 'row', gap: spacing.sm },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.slate,
  },
  routeText: { fontSize: 17, fontWeight: '600', color: colors.white },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  callRowText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primary },
  returnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm },
  returnText: { fontSize: 14, color: colors.textMuted },
});
