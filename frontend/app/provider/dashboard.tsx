import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Avatar from '../../components/Avatar';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import ProviderHeader from '../../components/provider/ProviderHeader';
import ProviderProfileStrip from '../../components/provider/ProviderProfileStrip';
import ProviderTabBar from '../../components/provider/ProviderTabBar';
import VerificationBanner from '../../components/provider/VerificationBanner';
import StatusBadge from '../../components/StatusBadge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { useFocusPolling } from '../../hooks/useFocusPolling';
import { providerPortalService } from '../../services/providerPortalService';
import type { ProviderJob } from '../../types/providerJob';
import { CATEGORY_META, formatBookingDate, formatTimeSlot, sriLankaToday } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';
import { formatCompactLKR, relativeDayLabel } from '../../utils/providerSchedule';

function when(job: ProviderJob, today: string): string {
  const start = formatTimeSlot(job.timeSlot).split(' – ')[0];
  const rel = relativeDayLabel(job.scheduledDate, today);
  return `${start} ${rel || formatBookingDate(job.scheduledDate, false)}`;
}

// Provider Dashboard (Milestone 02 Variant A / Figma "Dashboard"): KPIs for
// jobs, pending requests and earnings, the next job and request actions.
// All numbers come from the API (GET /provider/dashboard).
export default function ProviderDashboard() {
  const { data, error, loading, refreshing, reload } = useAsync(
    () => Promise.all([providerPortalService.me(), providerPortalService.dashboard()]),
    [],
  );
  useFocusPolling(() => void reload(true));

  if (loading && !data) return <Loading message="Loading dashboard…" />;

  const [account, dash] = data ?? [];
  const today = sriLankaToday().date;
  const pending = dash?.pendingRequests ?? 0;
  const next = dash?.nextJob ?? null;
  const firstName = account?.name.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ProviderHeader title="Dashboard" hasAlerts={pending > 0} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
      >
        {error ? (
          <FormMessage message={getFriendlyErrorMessage(error)} />
        ) : null}

        {account ? <ProviderProfileStrip account={account} /> : null}
        {account ? <VerificationBanner account={account} /> : null}
        {account && account.servicesCount === 0 ? (
          <Pressable
            style={styles.servicesPrompt}
            onPress={() => router.navigate('/provider/availability')}
            accessibilityRole="button"
            accessibilityLabel="Add your services and rates"
          >
            <Ionicons name="pricetags-outline" size={20} color={colors.primary} />
            <View style={styles.flex}>
              <Text style={styles.servicesPromptTitle}>Add your services &amp; rates</Text>
              <Text style={styles.servicesPromptBody}>
                Customers can only book providers with listed services. Add them under Schedule.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        ) : null}

        <View style={styles.greeting}>
          <Text style={styles.greetingEmoji}>🙏</Text>
          <View style={styles.flex}>
            <Text style={styles.greetingTitle}>Ayubowan / Vanakkam, {firstName}!</Text>
            <Text style={styles.greetingBody}>
              {pending > 0
                ? `You have ${pending} pending job ${pending === 1 ? 'request' : 'requests'} waiting${account ? ` in ${account.serviceArea}` : ''}.`
                : 'No pending job requests right now.'}
            </Text>
          </View>
        </View>

        {/* KPI cards */}
        <View style={styles.kpis}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Today&apos;s Jobs</Text>
            <Text style={styles.kpiValue}>{dash?.todayJobs ?? 0}</Text>
            <View style={styles.kpiChip}>
              <Text style={styles.kpiChipText}>{dash?.todayCompleted ?? 0} Done</Text>
            </View>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Requests</Text>
            <Text style={[styles.kpiValue, pending > 0 && { color: colors.orange }]}>{pending}</Text>
            <View style={[styles.kpiChip, pending > 0 && { backgroundColor: colors.orangeSoft }]}>
              <Text style={[styles.kpiChipText, pending > 0 && { color: '#8A4B00' }]}>
                {pending > 0 ? 'Action req.' : 'All clear'}
              </Text>
            </View>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Earnings</Text>
            <Text style={[styles.kpiValue, styles.kpiMoney]}>{formatCompactLKR(dash?.todayEarnings ?? 0)}</Text>
            <View style={styles.kpiChip}>
              <Text style={styles.kpiChipText}>Today</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryAction, pressed && { opacity: 0.9 }]}
          onPress={() => router.navigate('/provider/booking-requests')}
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
          <Text style={styles.primaryActionText}>VIEW BOOKING REQUESTS ({pending})</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryAction, pressed && { opacity: 0.9 }]}
          onPress={() => router.navigate('/provider/availability')}
          accessibilityRole="button"
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          <Text style={styles.secondaryActionText}>MANAGE AVAILABILITY</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>

        {/* Next scheduled job */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next Scheduled Job</Text>
          {next ? (
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={13} color={colors.primaryDark} />
              <Text style={styles.timeChipText}>{when(next, today)}</Text>
            </View>
          ) : null}
        </View>

        {next ? (
          <View style={styles.jobCard}>
            <View style={styles.jobTop}>
              <Avatar name={next.customer.name} size={48} />
              <View style={styles.flex}>
                <Text style={styles.jobCustomer}>{next.customer.name}</Text>
                <View style={styles.inline}>
                  <Ionicons name={CATEGORY_META[next.service.category].icon} size={14} color={colors.primary} />
                  <Text style={styles.jobService}>{next.service.name}</Text>
                </View>
              </View>
              <View style={styles.jobPrice}>
                <Text style={styles.jobPriceValue}>{formatLKR(next.pricing.total)}</Text>
                <Text style={styles.jobPriceLabel}>Cash on service</Text>
              </View>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={colors.danger} />
              <Text style={styles.addressText} numberOfLines={2}>
                {next.location.street ? `${next.location.street}, ` : ''}
                {next.location.city}
              </Text>
              <StatusBadge status={next.status} />
            </View>
            <View style={styles.jobActions}>
              <Pressable
                style={[styles.jobButton, styles.jobButtonLight]}
                onPress={() => next.customer.phone && Linking.openURL(`tel:${next.customer.phone}`)}
                disabled={!next.customer.phone}
                accessibilityRole="button"
                accessibilityLabel={`Call ${next.customer.name}`}
              >
                <Ionicons name="call-outline" size={18} color={colors.primary} />
                <Text style={styles.jobButtonLightText}>Call Client</Text>
              </Pressable>
              <Pressable
                style={[styles.jobButton, styles.jobButtonDark]}
                onPress={() => router.push({ pathname: '/provider/customer-location', params: { id: next.id } })}
                accessibilityRole="button"
              >
                <Ionicons name="navigate-outline" size={18} color={colors.white} />
                <Text style={styles.jobButtonDarkText}>View Job</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={28} color={colors.textSubtle} />
            <Text style={styles.emptyText}>No confirmed jobs yet. Accepted requests will appear here.</Text>
          </View>
        )}

        {dash && dash.upcomingJobs.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
              <Text style={styles.sectionCount}>{dash.upcomingJobs.length}</Text>
            </View>
            {dash.upcomingJobs.map((job) => (
              <Pressable
                key={job.id}
                style={styles.laterRow}
                onPress={() => router.push({ pathname: '/provider/customer-location', params: { id: job.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${job.service.name}, ${when(job, today)}`}
              >
                <View style={styles.laterIcon}>
                  <Ionicons name="home-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.laterTitle} numberOfLines={1}>
                    {job.service.name}
                  </Text>
                  <Text style={styles.laterSub}>
                    {when(job, today)} • {job.location.city}
                  </Text>
                </View>
                <Text style={styles.laterPrice}>{formatLKR(job.pricing.total)}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </>
        ) : null}

        <Text style={styles.footnote}>
          {dash ? `${dash.completedJobs} completed • ${dash.activeJobs} active` : ''}
        </Text>
      </ScrollView>
      <ProviderTabBar active="dashboard" requestCount={pending} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.lavender },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  servicesPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
  },
  servicesPromptTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  servicesPromptBody: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  greeting: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#CFE3F7',
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  greetingEmoji: { fontSize: 20 },
  greetingTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  greetingBody: { fontSize: 13, color: colors.primaryDark, marginTop: 2 },
  kpis: { flexDirection: 'row', gap: spacing.sm },
  kpi: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  kpiLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  kpiValue: { fontSize: 24, fontWeight: '600', color: colors.text },
  kpiMoney: { fontSize: 19, color: colors.success, paddingVertical: 3 },
  kpiChip: {
    backgroundColor: colors.lavenderStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  kpiChipText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  primaryActionText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lavenderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
  },
  secondaryActionText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  sectionCount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CFE3F7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  timeChipText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  jobCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  jobTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  jobCustomer: { fontSize: 17, fontWeight: '600', color: colors.text },
  jobService: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  jobPrice: { alignItems: 'flex-end' },
  jobPriceValue: { fontSize: 19, fontWeight: '600', color: colors.primary },
  jobPriceLabel: { fontSize: 11, color: colors.textMuted },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lavender,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  addressText: { flex: 1, fontSize: 13, color: colors.text },
  jobActions: { flexDirection: 'row', gap: spacing.sm },
  jobButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 46,
    borderRadius: radius.md,
  },
  jobButtonLight: { backgroundColor: colors.lavenderStrong },
  jobButtonLightText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  jobButtonDark: { backgroundColor: colors.primary },
  jobButtonDarkText: { fontSize: 14, fontWeight: '600', color: colors.white },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  laterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  laterIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  laterSub: { fontSize: 12, color: colors.textMuted },
  laterPrice: { fontSize: 15, fontWeight: '600', color: colors.text },
  footnote: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
