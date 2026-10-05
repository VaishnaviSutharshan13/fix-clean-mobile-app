import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AdminShell from '../../components/admin/AdminShell';
import { ACard, AButton, IconTile, SectionLabel, Tag } from '../../components/admin/Primitives';
import StatCard from '../../components/admin/StatCard';
import StatusPill from '../../components/admin/StatusPill';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import { ac, af, ar, cardShadow } from '../../constants/adminTheme';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../hooks/useAuth';
import { useFocusPolling } from '../../hooks/useFocusPolling';
import { adminService } from '../../services/adminService';
import { ADMIN_BOOKING_META } from '../../utils/admin';
import { formatDateTime, formatRelative } from '../../utils/dates';
import { getFriendlyErrorMessage, getInitials } from '../../utils/helpers';

const pad2 = (n: number) => String(n).padStart(2, '0');

// Admin Dashboard — Admin Figma frame 1:1519 ("Operational Overview").
// Every number is live from MongoDB (GET /admin/dashboard).
export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, error, loading, refreshing, reload } = useAsync(() => adminService.dashboard(), []);
  useFocusPolling(() => void reload(true));

  if (loading && !data) return <Loading message="Loading dashboard…" />;

  const pending = data?.providers.pending ?? 0;
  const unresolved = data?.complaints.unresolved ?? 0;

  return (
    <AdminShell
      section="Admin Dashboard"
      tab="dashboard"
      alert={pending > 0}
      badges={{ verify: pending }}
      refreshing={refreshing}
      onRefresh={() => reload(true)}
    >
      {error && !data ? (
        <StateView
          icon="cloud-offline-outline"
          title="Couldn't load the dashboard"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      ) : null}
      {error && data ? <FormMessage message={getFriendlyErrorMessage(error)} /> : null}

      {data ? (
        <>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE DATA</Text>
              </View>
              <Text style={styles.heroCode}>{formatDateTime(data.generatedAt)}</Text>
              <View style={styles.heroIcon}>
                <Ionicons name="git-network-outline" size={24} color={ac.primary} />
              </View>
            </View>
            <Text style={styles.heroTitle}>Operational Overview</Text>
            <Text style={styles.heroSub}>{user?.name ?? 'Administrator'} • FIX &amp; CLEAN CO., Sri Lanka</Text>
          </View>

          {/* KPI cards */}
          <View style={styles.grid}>
            <StatCard
              label="Total Users"
              value={data.users.total.toLocaleString('en-US')}
              icon="people-outline"
              caption={
                <Text style={styles.cap}>
                  {data.users.customers.toLocaleString('en-US')} Cust •{' '}
                  <Text style={styles.capBlue}>{data.users.providers.toLocaleString('en-US')} Pros</Text>
                </Text>
              }
              onPress={() => router.navigate('/admin/user-management')}
            />
            <StatCard
              label="Service Pros"
              value={data.providers.verified}
              icon="construct-outline"
              tint={ac.tertiary}
              tintBg={ac.tertiaryContainer}
              badge={<View style={styles.greenDot} />}
              caption={
                <Text style={styles.cap}>
                  <Text style={styles.capGreen}>{data.providers.bookable} Bookable</Text> • Verified
                </Text>
              }
              accessibilityLabel={`Service pros: ${data.providers.verified} verified, ${data.providers.bookable} bookable`}
              onPress={() => router.navigate({ pathname: '/admin/verification-requests', params: { status: 'verified' } })}
            />
            <StatCard
              label="Active Jobs"
              value={data.bookings.active}
              icon="calendar-outline"
              badge={<Tag label="Live" bg={ac.containerHigh} fg={ac.primary} />}
              caption={
                <Text style={styles.cap}>
                  {data.bookings.byStatus.requested} New •{' '}
                  <Text style={styles.capStrong}>
                    {data.bookings.byStatus.confirmed + data.bookings.byStatus.on_the_way} In Progress
                  </Text>
                </Text>
              }
              onPress={() => router.navigate('/admin/booking-monitoring')}
            />
            <StatCard
              label="Complaints"
              value={pad2(unresolved)}
              valueColor={unresolved > 0 ? ac.errorStrong : ac.text}
              icon="warning-outline"
              tint={ac.error}
              tintBg={ac.errorContainer}
              badge={unresolved > 0 ? <Text style={styles.actionReq}>Action req.</Text> : undefined}
              caption={
                <Text style={styles.cap}>
                  <Text style={styles.capRed}>{data.complaints.open} Open</Text> • {data.complaints.inReview} In Review
                </Text>
              }
              accessibilityLabel={`Complaints: ${unresolved} unresolved`}
              onPress={() => router.navigate('/admin/complaints')}
            />
          </View>

          {/* Priority alert: verification queue */}
          <ACard>
            <View style={styles.alertHead}>
              {pending > 0 ? (
                <Tag label="PRIORITY ALERT • URGENT" bg={ac.errorContainer} fg={ac.onErrorContainer} icon="warning-outline" />
              ) : (
                <Tag label="QUEUE CLEAR" bg={ac.successSoft} fg={ac.success} icon="checkmark-circle-outline" />
              )}
              <Text style={styles.alertDesk}>Verification Desk</Text>
            </View>
            <View style={styles.alertBody}>
              <View>
                <View style={styles.alertAvatar}>
                  <Text style={styles.alertAvatarText}>
                    {data.pendingVerifications[0] ? getInitials(data.pendingVerifications[0].name) : '✓'}
                  </Text>
                </View>
                {pending > 0 ? (
                  <View style={styles.alertCount}>
                    <Text style={styles.alertCountText}>{pending}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.flex}>
                <Text style={styles.alertTitle}>Pending Verifications: {pending}</Text>
                <Text style={styles.alertText}>
                  {pending === 0
                    ? 'No provider applications are waiting for review.'
                    : `${data.pendingVerifications[0]?.name ?? 'A provider'}${pending > 1 ? ` and ${pending - 1} other provider${pending > 2 ? 's' : ''}` : ''} awaiting review of profile, services & rates (submitted ${formatRelative(data.pendingVerifications[0]?.submittedAt ?? data.generatedAt).toLowerCase()}).`}
                </Text>
              </View>
            </View>
            <AButton
              label={`Review Verifications (${pending})`}
              iconRight="arrow-forward"
              onPress={() => router.navigate('/admin/verification-requests')}
            />
          </ACard>

          {/* Dispatch feed: real booking status counts (no map/GPS in this app) */}
          <ACard>
            <View style={styles.feedHead}>
              <View style={styles.liveDotLg} />
              <Text style={styles.feedTitle}>Dispatch Feed: Live</Text>
              <Tag label={`${data.bookings.active} active`} bg={ac.primaryFixed} fg={ac.primary} />
            </View>
            <FeedRow
              dot={ac.amber}
              title="Requested"
              sub="Waiting for the provider to accept"
              value={data.bookings.byStatus.requested}
              status="requested"
            />
            <FeedRow
              dot={ac.success}
              title="Confirmed"
              sub="Accepted • address shared with provider"
              value={data.bookings.byStatus.confirmed}
              status="confirmed"
            />
            <FeedRow
              dot={ac.primary}
              title="On the Way"
              sub="Provider travelling to the customer"
              value={data.bookings.byStatus.on_the_way}
              status="on_the_way"
            />
          </ACard>

          <SectionLabel>Operations Quick Navigation</SectionLabel>
          <NavRow
            icon="people-circle-outline"
            title="Manage Users"
            sub="Customers, service providers & administrators"
            onPress={() => router.navigate('/admin/user-management')}
          />
          <NavRow
            icon="pulse-outline"
            title="Monitor Live Bookings"
            count={data.bookings.active}
            sub="Live booking status, dispatches & escalations"
            onPress={() => router.navigate('/admin/booking-monitoring')}
          />
          <NavRow
            icon="chatbox-ellipses-outline"
            title="Complaints & Disputes"
            count={unresolved}
            countTone="error"
            sub="Customer complaints about bookings"
            onPress={() => router.navigate('/admin/complaints')}
          />

          {/* Secondary: remaining totals required by FR8 */}
          <SectionLabel>Platform Totals</SectionLabel>
          <ACard style={styles.totals}>
            <Total label="Completed" value={data.bookings.completed} />
            <Total label="Cancelled / declined" value={data.bookings.cancelledOrDeclined} />
            <Total label="All bookings" value={data.bookings.total} />
            <Total label="Rejected providers" value={data.providers.rejected} />
            <Total label="Suspended users" value={data.users.suspended} />
            <Total label="Resolved complaints" value={data.complaints.resolved} />
          </ACard>

          <SectionLabel>Latest Booking Activity</SectionLabel>
          {data.recentBookings.length === 0 ? (
            <ACard>
              <Text style={styles.empty}>No bookings yet.</Text>
            </ACard>
          ) : (
            data.recentBookings.map((b) => (
              <Pressable
                key={b.id}
                style={styles.activity}
                onPress={() => router.push({ pathname: '/admin/booking-details', params: { id: b.id } })}
                accessibilityRole="button"
                accessibilityLabel={`Booking ${b.reference}`}
              >
                <View style={styles.flex}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {b.reference} • {b.service.name}
                  </Text>
                  <Text style={styles.activitySub} numberOfLines={1}>
                    {b.customer.name} → {b.provider.name}
                  </Text>
                </View>
                <StatusPill meta={ADMIN_BOOKING_META[b.status]} />
              </Pressable>
            ))
          )}
        </>
      ) : null}
    </AdminShell>
  );
}

function FeedRow({ dot, title, sub, value, status }: { dot: string; title: string; sub: string; value: number; status: 'requested' | 'confirmed' | 'on_the_way' }) {
  return (
    <Pressable
      style={styles.feedRow}
      onPress={() => router.navigate({ pathname: '/admin/booking-monitoring', params: { status } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
    >
      <View style={[styles.feedDot, { backgroundColor: dot }]} />
      <View style={styles.flex}>
        <Text style={styles.feedRowTitle}>{title}</Text>
        <Text style={styles.feedRowSub}>{sub}</Text>
      </View>
      <Text style={[styles.feedValue, { color: value > 0 && status === 'requested' ? ac.tertiary : ac.primary }]}>
        {value} {value === 1 ? 'job' : 'jobs'}
      </Text>
    </Pressable>
  );
}

function NavRow({
  icon,
  title,
  sub,
  count,
  countTone,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  sub: string;
  count?: number;
  countTone?: 'error';
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <IconTile icon={icon} size={40} />
      <View style={styles.flex}>
        <View style={styles.navTitleRow}>
          <Text style={styles.navTitle}>{title}</Text>
          {count !== undefined && count > 0 ? (
            <View style={[styles.navCount, countTone === 'error' && { backgroundColor: ac.errorContainer }]}>
              <Text style={[styles.navCountText, countTone === 'error' && { color: ac.onErrorContainer }]}>{count}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.navSub}>{sub}</Text>
      </View>
      <View style={styles.navArrow}>
        <Ionicons name="arrow-forward" size={18} color={ac.text} />
      </View>
    </Pressable>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.total}>
      <Text style={styles.totalValue}>{value}</Text>
      <Text style={styles.totalLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hero: { backgroundColor: ac.containerLow, borderRadius: ar.lg, padding: 16, gap: 6, ...cardShadow, shadowOpacity: 0.04 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ac.card, borderRadius: ar.full, paddingHorizontal: 12, paddingVertical: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ac.success },
  liveText: { fontFamily: af.bold, fontSize: 12, color: ac.success, letterSpacing: 0.4 },
  heroCode: { flex: 1, fontFamily: af.medium, fontSize: 12, color: ac.textMuted },
  heroIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: ac.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: af.heading, fontSize: 27, lineHeight: 33, color: ac.text, letterSpacing: -0.8 },
  heroSub: { fontFamily: af.body, fontSize: 14, color: ac.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cap: { fontFamily: af.body, fontSize: 13, color: ac.textMuted },
  capBlue: { color: ac.primary, fontFamily: af.medium },
  capGreen: { color: ac.success, fontFamily: af.semibold },
  capRed: { color: ac.errorStrong, fontFamily: af.semibold },
  capStrong: { color: ac.text, fontFamily: af.semibold },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ac.success },
  actionReq: { fontFamily: af.semibold, fontSize: 13, color: ac.errorStrong },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  alertDesk: { flex: 1, fontFamily: af.medium, fontSize: 13, color: ac.textMuted },
  alertBody: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  alertAvatar: { width: 56, height: 56, borderRadius: 12, backgroundColor: ac.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  alertAvatarText: { fontFamily: af.heading, fontSize: 20, color: ac.primary },
  alertCount: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    backgroundColor: ac.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ac.card,
  },
  alertCountText: { fontFamily: af.bold, fontSize: 11, color: ac.onTertiaryContainer },
  alertTitle: { fontFamily: af.heading, fontSize: 18, color: ac.text, letterSpacing: -0.4 },
  alertText: { fontFamily: af.body, fontSize: 13, lineHeight: 18, color: ac.textMuted, marginTop: 2 },
  feedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDotLg: { width: 10, height: 10, borderRadius: 5, backgroundColor: ac.success },
  feedTitle: { flex: 1, fontFamily: af.heading, fontSize: 19, color: ac.text, letterSpacing: -0.4 },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ac.containerLow, borderRadius: ar.md, padding: 12 },
  feedDot: { width: 8, height: 8, borderRadius: 4 },
  feedRowTitle: { fontFamily: af.semibold, fontSize: 15, color: ac.text },
  feedRowSub: { fontFamily: af.body, fontSize: 12, color: ac.textMuted },
  feedValue: { fontFamily: af.bold, fontSize: 14 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ac.card, borderRadius: ar.lg, padding: 14, ...cardShadow },
  navTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  navTitle: { fontFamily: af.heading, fontSize: 17, color: ac.text, letterSpacing: -0.3 },
  navCount: { backgroundColor: ac.primaryFixed, borderRadius: ar.full, paddingHorizontal: 8, paddingVertical: 1 },
  navCountText: { fontFamily: af.bold, fontSize: 12, color: ac.primary },
  navSub: { fontFamily: af.body, fontSize: 13, color: ac.textMuted, marginTop: 1 },
  navArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: ac.containerLow, alignItems: 'center', justifyContent: 'center' },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  total: { flexBasis: '30%', flexGrow: 1, minWidth: 0, backgroundColor: ac.containerLow, borderRadius: ar.md, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  totalValue: { fontFamily: af.heading, fontSize: 20, color: ac.text },
  totalLabel: { fontFamily: af.medium, fontSize: 11, color: ac.textMuted, textAlign: 'center' },
  empty: { fontFamily: af.body, fontSize: 13, color: ac.textMuted, textAlign: 'center' },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ac.card, borderRadius: ar.md, padding: 12, ...cardShadow },
  activityTitle: { fontFamily: af.semibold, fontSize: 14, color: ac.text },
  activitySub: { fontFamily: af.body, fontSize: 12, color: ac.textMuted },
});
