import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AdminShell from '../../components/admin/AdminShell';
import FilterChips from '../../components/admin/FilterChips';
import { ACard, AButton, BackLink, PageTitle, SectionLabel, Tag, Well } from '../../components/admin/Primitives';
import SearchField from '../../components/admin/SearchField';
import StatusPill from '../../components/admin/StatusPill';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import { ac, af, ar } from '../../constants/adminTheme';
import { useAsync } from '../../hooks/useAsync';
import { useFocusPolling } from '../../hooks/useFocusPolling';
import { adminService } from '../../services/adminService';
import type { AdminProviderListItem, ProviderStatusFilter } from '../../types/admin';
import {
  CHECK_ITEMS,
  confirmedCheckCount,
  formatExperience,
  PROVIDER_FILTERS,
  shortRef,
  SUSPENDED_META,
  VERIFICATION_META,
} from '../../utils/admin';
import { CATEGORY_META } from '../../utils/display';
import { formatDateTime, formatRelative } from '../../utils/dates';
import { formatLKR, getFriendlyErrorMessage, getInitials } from '../../utils/helpers';

const isFilter = (v: unknown): v is ProviderStatusFilter => PROVIDER_FILTERS.some((f) => f.key === v);

// Provider Verifications — Admin Figma frame 1:1773. Real ProviderProfiles
// from MongoDB; the pending queue is oldest first and its first card is shown
// as the priority card. Pending providers stay hidden from customers.
export default function VerificationRequests() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState<ProviderStatusFilter>(isFilter(params.status) ? params.status : 'pending');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isFilter(params.status)) setStatus(params.status);
  }, [params.status]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, loading, refreshing, reload } = useAsync(
    () => adminService.providers(status, query || undefined),
    [status, query],
  );
  useFocusPolling(() => void reload(true));

  const pendingCount = data?.counts.pending;
  const oldest = status === 'pending' ? data?.items[0] : undefined;
  const options = PROVIDER_FILTERS.map((f) => ({ key: f.key, label: f.label, count: data?.counts[f.key] }));

  return (
    <AdminShell
      section="Provider Verifications"
      tab="verify"
      alert={!!pendingCount}
      badges={{ verify: pendingCount }}
      refreshing={refreshing}
      onRefresh={() => reload(true)}
    >
      <BackLink
        label="Back to Dashboard"
        onPress={() => router.navigate('/admin/dashboard')}
        right={<Tag label={`QUEUE: ${pendingCount ?? '–'} PENDING`} dot={ac.dotOrange} fg={ac.textMuted} />}
      />
      <PageTitle title="Provider Verifications" subtitle="Review and validate submitted profiles, services and prices for on-boarding service pros" />

      <View style={styles.sla}>
        <View style={styles.slaIcon}>
          <Ionicons name="speedometer-outline" size={20} color={ac.tertiary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.slaTitle} numberOfLines={1}>
            {pendingCount ?? 0} Awaiting Review
          </Text>
          <Text style={styles.slaSub} numberOfLines={1}>
            {oldest ? `Oldest: ${formatRelative(oldest.submittedAt).toLowerCase()}` : 'Queue is clear'}
          </Text>
        </View>
        <View style={styles.slaRight}>
          <View style={styles.slaChip}>
            <Text style={styles.slaChipText}>{data?.counts.verified ?? 0} VERIFIED</Text>
          </View>
          <Text style={styles.slaHub}>Oldest first</Text>
        </View>
      </View>

      <SearchField value={search} onChangeText={setSearch} placeholder="Search name, email, district or trade" />
      <FilterChips options={options} value={status} onChange={setStatus} />

      {error ? <FormMessage message={getFriendlyErrorMessage(error)} /> : null}

      {loading && !data ? (
        <Loading message="Loading applications…" />
      ) : data && data.items.length === 0 ? (
        <StateView
          icon={status === 'pending' ? 'checkmark-done-circle-outline' : 'search-outline'}
          title={query ? 'No matching providers' : status === 'pending' ? 'No pending applications' : 'No providers here yet'}
          message={query ? 'Try a different name, district or trade.' : status === 'pending' ? 'New provider sign-ups will appear here for review.' : undefined}
        />
      ) : (
        data?.items.map((p, index) =>
          index === 0 && p === oldest ? <PriorityCard key={p.id} p={p} /> : <RequestCard key={p.id} p={p} />,
        )
      )}
    </AdminShell>
  );
}

const open = (id: string) => router.push({ pathname: '/admin/verification-details', params: { id } });

function Photo({ p, size = 64 }: { p: AdminProviderListItem; size?: number }) {
  return (
    <View>
      <View style={[styles.photo, { width: size, height: size }]}>
        <Text style={[styles.photoText, { fontSize: size * 0.34 }]}>{getInitials(p.name)}</Text>
      </View>
      {p.verificationStatus === 'verified' ? (
        <View style={styles.photoTick}>
          <Ionicons name="checkmark" size={11} color={ac.onPrimary} />
        </View>
      ) : null}
    </View>
  );
}

function TradeWell({ p, full }: { p: AdminProviderListItem; full?: boolean }) {
  const cat = CATEGORY_META[p.category];
  return (
    <Well>
      <View style={styles.wellRow}>
        <Ionicons name={cat.icon} size={18} color={full ? ac.primary : ac.tertiary} />
        <Text style={styles.trade}>{cat.label}</Text>
        <Text style={styles.wellMeta}>• {formatExperience(p.experienceYears)} exp</Text>
      </View>
      <View style={styles.wellRow}>
        <Ionicons name="location-outline" size={18} color={full ? ac.tertiary : ac.textMuted} />
        <Text style={styles.district}>{p.serviceArea}</Text>
      </View>
      {full ? (
        <View style={styles.wellRow}>
          <Ionicons name="pricetags-outline" size={18} color={p.servicesCount ? ac.success : ac.tertiary} />
          <Text style={[styles.servicesText, { color: p.servicesCount ? ac.success : ac.tertiary }]}>
            {p.servicesCount === 0
              ? 'No services & rates yet'
              : `${p.servicesCount} service${p.servicesCount === 1 ? '' : 's'} • from ${formatLKR(p.startingPrice ?? 0)}`}
          </Text>
        </View>
      ) : null}
    </Well>
  );
}

function PriorityCard({ p }: { p: AdminProviderListItem }) {
  return (
    <ACard accent={ac.amber}>
      <View style={styles.top}>
        <Photo p={p} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text style={styles.nameLg}>{p.name}</Text>
            <StatusPill meta={VERIFICATION_META.pending} label="Pending Review" />
          </View>
          <View style={styles.refTag}>
            <Text style={styles.refText}>{shortRef('PRO', p.id)}</Text>
          </View>
          <View style={styles.inline}>
            <Ionicons name="time-outline" size={14} color={ac.textMuted} />
            <Text style={styles.applied}>Applied {formatDateTime(p.submittedAt)}</Text>
          </View>
        </View>
      </View>
      <TradeWell p={p} full />
      <SectionLabel>{`Admin checks (${confirmedCheckCount(p.verificationChecks)}/${CHECK_ITEMS.length})`}</SectionLabel>
      <View style={styles.checkChips}>
        {CHECK_ITEMS.map((c) => {
          const ok = p.verificationChecks[c.key];
          return (
            <View key={c.key} style={styles.checkChip}>
              <Text style={styles.checkChipText}>{c.label}</Text>
              <Ionicons name={ok ? 'checkmark-circle-outline' : 'ellipse-outline'} size={16} color={ok ? ac.success : ac.outline} />
            </View>
          );
        })}
      </View>
      <AButton label="Review Application" caps iconRight="arrow-forward" onPress={() => open(p.id)} accessibilityLabel={`Open application from ${p.name}`} />
    </ACard>
  );
}

function RequestCard({ p }: { p: AdminProviderListItem }) {
  const checks = confirmedCheckCount(p.verificationChecks);
  const pending = p.verificationStatus === 'pending';
  const statusLine = !pending
    ? { text: p.reviewedAt ? `Reviewed ${formatDateTime(p.reviewedAt)}` : 'Reviewed', color: ac.textMuted, icon: 'time-outline' as const }
    : p.servicesCount === 0
      ? { text: 'Waiting for services & rates', color: ac.tertiary, icon: 'hourglass-outline' as const }
      : checks === CHECK_ITEMS.length
        ? { text: `${checks} of ${CHECK_ITEMS.length} checks confirmed`, color: ac.success, icon: 'checkmark-circle-outline' as const }
        : { text: `${checks} of ${CHECK_ITEMS.length} checks confirmed`, color: ac.tertiary, icon: 'sync-outline' as const };
  return (
    <Pressable onPress={() => open(p.id)} accessibilityRole="button" accessibilityLabel={`Open application from ${p.name}, ${VERIFICATION_META[p.verificationStatus].label}`}>
      <ACard>
        <View style={styles.top}>
          <Photo p={p} size={48} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{p.name}</Text>
              {pending ? (
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingTagText}>PENDING</Text>
                </View>
              ) : (
                <StatusPill meta={VERIFICATION_META[p.verificationStatus]} />
              )}
            </View>
            <View style={styles.inlineWrap}>
              <View style={styles.refTag}>
                <Text style={styles.refText}>{shortRef('PRO', p.id)}</Text>
              </View>
              {!p.accountActive ? <StatusPill meta={SUSPENDED_META} /> : null}
            </View>
            <Text style={styles.applied}>Applied {formatDateTime(p.submittedAt)}</Text>
          </View>
        </View>
        <TradeWell p={p} />
        <View style={styles.cardFoot}>
          <Ionicons name={statusLine.icon} size={16} color={statusLine.color} />
          <Text style={[styles.footText, { color: statusLine.color }]}>{statusLine.text}</Text>
          <View style={styles.reviewBtn}>
            <Text style={styles.reviewBtnText}>{pending ? 'Review' : 'View'}</Text>
            <Ionicons name="arrow-forward" size={15} color={ac.primary} />
          </View>
        </View>
      </ACard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  inlineWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  sla: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ac.containerLow, borderRadius: ar.lg, padding: 14 },
  slaIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: ac.tertiaryContainer, alignItems: 'center', justifyContent: 'center' },
  slaTitle: { fontFamily: af.semibold, fontSize: 15, color: ac.text },
  slaSub: { fontFamily: af.body, fontSize: 12, color: ac.textMuted },
  slaRight: { alignItems: 'flex-end', gap: 4 },
  slaChip: { backgroundColor: ac.successBright, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  slaChipText: { fontFamily: af.bold, fontSize: 11, color: ac.onSuccessBright, letterSpacing: 0.3 },
  slaHub: { fontFamily: af.body, fontSize: 11, color: ac.textMuted },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  photo: { borderRadius: ar.md, backgroundColor: ac.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  photoText: { fontFamily: af.heading, color: ac.primary },
  photoTick: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ac.success,
    borderWidth: 2,
    borderColor: ac.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Name and status chip share a row; the chip wraps under long names at 360px.
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', columnGap: 8, rowGap: 4 },
  nameLg: { flexShrink: 1, fontFamily: af.heading, fontSize: 20, lineHeight: 25, color: ac.text, letterSpacing: -0.4 },
  name: { flexShrink: 1, fontFamily: af.heading, fontSize: 18, lineHeight: 23, color: ac.text, letterSpacing: -0.4 },
  refTag: { alignSelf: 'flex-start', backgroundColor: ac.containerHigh, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  refText: { fontFamily: af.semibold, fontSize: 12, color: ac.textMuted },
  applied: { fontFamily: af.body, fontSize: 12, color: ac.textMuted, marginTop: 2, flexShrink: 1 },
  pendingTag: { backgroundColor: ac.containerHigh, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  pendingTagText: { fontFamily: af.bold, fontSize: 11, color: ac.textMuted, letterSpacing: 0.4 },
  wellRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  trade: { fontFamily: af.semibold, fontSize: 15, color: ac.text },
  wellMeta: { fontFamily: af.body, fontSize: 13, color: ac.textMuted },
  district: { fontFamily: af.body, fontSize: 14, color: ac.text, flexShrink: 1 },
  servicesText: { fontFamily: af.semibold, fontSize: 13, flexShrink: 1 },
  checkChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 },
  checkChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ac.containerHigh, borderRadius: ar.full, paddingHorizontal: 12, paddingVertical: 6 },
  checkChipText: { fontFamily: af.medium, fontSize: 13, color: ac.text },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footText: { flex: 1, fontFamily: af.semibold, fontSize: 13 },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ac.containerHigh, borderRadius: ar.md, paddingHorizontal: 14, paddingVertical: 9 },
  reviewBtnText: { fontFamily: af.semibold, fontSize: 14, color: ac.primary },
});
