import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AdminShell from '../../components/admin/AdminShell';
import FilterChips from '../../components/admin/FilterChips';
import { ACard, AButton, BackLink, PageTitle, Well } from '../../components/admin/Primitives';
import SearchField from '../../components/admin/SearchField';
import StatusPill from '../../components/admin/StatusPill';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import { ac, af, ar, cardShadow } from '../../constants/adminTheme';
import { useAsync } from '../../hooks/useAsync';
import { useFocusPolling } from '../../hooks/useFocusPolling';
import { adminService } from '../../services/adminService';
import type { AdminBookingListItem } from '../../types/admin';
import type { BookingStatus } from '../../types/booking';
import { ADMIN_BOOKING_META, BOOKING_ACCENT, BOOKING_FILTERS } from '../../utils/admin';
import { CATEGORY_META } from '../../utils/display';
import { formatBookingDate, formatDateTime, formatTimeSlot } from '../../utils/dates';
import { formatLKR, getFriendlyErrorMessage, getInitials } from '../../utils/helpers';
import { formatLKRCompact } from '../../utils/money';

const POLL_MS = 15_000;
const ACTIVE: BookingStatus[] = ['requested', 'confirmed', 'on_the_way'];
const isStatus = (v: unknown): v is BookingStatus => BOOKING_FILTERS.includes(v as BookingStatus) && v !== undefined;

// Booking Monitor / Live Dispatch — Admin Figma frame 1:2430 ("Live Monitor
// And Complaints"). Every booking with its current status, refreshed every
// 15 s while open. Read-only. "Live" means live booking status: the app has
// no GPS, map, distance or ETA, so those Figma elements show booking data.
export default function BookingMonitoring() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState<BookingStatus | undefined>(isStatus(params.status) ? params.status : undefined);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isStatus(params.status)) setStatus(params.status);
  }, [params.status]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, loading, refreshing, reload } = useAsync(
    () => Promise.all([adminService.bookings(status, query || undefined), adminService.complaints('open')]),
    [status, query],
  );
  const [list, openComplaints] = data ?? [];
  const [checkedAt, setCheckedAt] = useState<Date>();
  useEffect(() => {
    if (data) setCheckedAt(new Date());
  }, [data]);
  useFocusPolling(() => void reload(true), POLL_MS);

  const counts = list?.counts;
  const active = counts ? counts.requested + counts.confirmed + counts.on_the_way : 0;
  const activeValue = useMemo(
    () => (list?.items ?? []).filter((b) => ACTIVE.includes(b.status)).reduce((sum, b) => sum + b.total, 0),
    [list],
  );
  const options = BOOKING_FILTERS.map((key) => ({
    key,
    label: key ? ADMIN_BOOKING_META[key].label : 'All',
    count: counts?.[key ?? 'all'],
  }));
  const unresolved = openComplaints ? openComplaints.counts.open + openComplaints.counts.in_review : 0;

  return (
    <AdminShell section="Live Monitor And Complaints" tab="bookings" refreshing={refreshing} onRefresh={() => reload(true)}>
      <BackLink label="Back to Admin Console" onPress={() => router.navigate('/admin/dashboard')} />
      <PageTitle
        title="Booking Monitor"
        live
        subtitle={`Live status feed • updates every 15 s${checkedAt ? ` • ${formatDateTime(checkedAt.toISOString()).split(', ')[1]}` : ''}`}
        right={
          <Pressable style={styles.refresh} onPress={() => reload(true)} accessibilityRole="button" accessibilityLabel="Refresh bookings">
            <Ionicons name="refresh" size={20} color={ac.text} />
          </Pressable>
        }
      />

      <FilterChips options={options} value={status} onChange={setStatus} />

      <View style={styles.kpiWell}>
        <Kpi icon="pulse-outline" label="Active" value={String(active)} suffix={counts ? `/${counts.all}` : ''} sub={`${counts?.requested ?? 0} awaiting reply`} />
        <Kpi icon="checkmark-done-outline" label="Completed" value={String(counts?.completed ?? 0)} sub={`${(counts?.cancelled ?? 0) + (counts?.declined ?? 0)} closed early`} />
        <Kpi icon="cash-outline" label="Active value" value={formatLKRCompact(activeValue)} sub="Across listed jobs" />
      </View>

      <Pressable
        style={styles.complaintsLink}
        onPress={() => router.push('/admin/complaints')}
        accessibilityRole="button"
        accessibilityLabel={`Complaints and disputes, ${unresolved} unresolved`}
      >
        <View style={styles.complaintsIcon}>
          <Ionicons name="chatbox-ellipses-outline" size={20} color={ac.error} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.complaintsTitle}>Complaints &amp; Disputes</Text>
          <Text style={styles.complaintsSub}>{unresolved} unresolved • customer escalations</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={ac.text} />
      </Pressable>

      <SearchField value={search} onChangeText={setSearch} placeholder="Search reference, name, service or city" />

      {error ? <FormMessage message={getFriendlyErrorMessage(error)} /> : null}

      {loading && !data ? (
        <Loading message="Loading bookings…" />
      ) : list && list.items.length === 0 ? (
        <StateView
          icon="calendar-clear-outline"
          title="No bookings found"
          message={query || status ? 'Try another filter or search.' : 'Bookings made by customers appear here.'}
        />
      ) : (
        list?.items.map((b, index) => <BookingCard key={b.id} b={b} featured={index === 0} />)
      )}

      <View style={styles.readOnly}>
        <View style={styles.readOnlyIcon}>
          <Ionicons name="eye-outline" size={20} color={ac.onPrimary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.readOnlyTitle}>Read-only monitor</Text>
          <Text style={styles.readOnlySub}>Status changes are made by customers and providers. No GPS or map tracking.</Text>
        </View>
        <View style={styles.readOnlyChip}>
          <Text style={styles.readOnlyChipText}>LIVE</Text>
        </View>
      </View>
    </AdminShell>
  );
}

function Kpi({ icon, label, value, suffix, sub }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; suffix?: string; sub: string }) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiHead}>
        <Ionicons name={icon} size={14} color={ac.success} />
        <Text style={styles.kpiLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {suffix ? <Text style={styles.kpiSuffix}>{suffix}</Text> : null}
      </Text>
      <Text style={styles.kpiSub} numberOfLines={2}>
        {sub}
      </Text>
    </View>
  );
}

function Person({ role, name }: { role: string; name: string }) {
  return (
    <View style={styles.person}>
      <View style={styles.personAvatar}>
        <Text style={styles.personInitials}>{getInitials(name)}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.personRole}>{role}</Text>
        <Text style={styles.personName} numberOfLines={2}>
          {name}
        </Text>
      </View>
    </View>
  );
}

function BookingCard({ b, featured }: { b: AdminBookingListItem; featured: boolean }) {
  const cat = CATEGORY_META[b.service.category];
  const open = () => router.push({ pathname: '/admin/booking-details', params: { id: b.id } });
  return (
    <ACard accent={BOOKING_ACCENT[b.status]}>
      <View style={styles.cardHead}>
        <Ionicons name={cat.icon} size={20} color={cat.tint} />
        <Text style={styles.ref}>#{b.reference}</Text>
        <StatusPill meta={ADMIN_BOOKING_META[b.status]} />
      </View>
      <Well style={styles.serviceWell}>
        <Text style={styles.service}>
          {b.service.name}
          <Text style={styles.serviceCat}> • {cat.label}</Text>
        </Text>
      </Well>
      <View style={styles.people}>
        <Person role="CUSTOMER" name={b.customer.name} />
        <Person role="PROVIDER" name={b.provider.name} />
      </View>
      <View style={styles.cityRow}>
        <Ionicons name="location-outline" size={18} color={ac.primary} />
        <View style={styles.flex}>
          <Text style={styles.city}>{b.city}</Text>
          <Text style={styles.updated} numberOfLines={1}>
            {b.lastUpdate
              ? `${ADMIN_BOOKING_META[b.lastUpdate.status].label} ${formatDateTime(b.lastUpdate.changedAt)}`
              : `Created ${formatDateTime(b.createdAt)}`}
          </Text>
        </View>
      </View>
      <Well style={styles.schedWell}>
        <Ionicons name="time-outline" size={17} color={ac.text} />
        <Text style={styles.sched}>
          Scheduled: {formatBookingDate(b.scheduledDate, false)}, {formatTimeSlot(b.timeSlot).split(' – ')[0]}
        </Text>
        <View style={styles.agreed}>
          <Text style={styles.agreedLabel}>Agreed:</Text>
          <Text style={styles.agreedValue} numberOfLines={1}>
            {formatLKR(b.total)}
          </Text>
        </View>
      </Well>
      {featured ? (
        <AButton label="View Booking Details" caps iconRight="arrow-forward" onPress={open} accessibilityLabel={`Open booking ${b.reference}`} />
      ) : (
        <AButton
          label="View Details"
          tone="light"
          iconRight="arrow-forward"
          small
          onPress={open}
          style={styles.lightBtn}
          accessibilityLabel={`Open booking ${b.reference}`}
        />
      )}
    </ACard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  refresh: { width: 40, height: 40, borderRadius: 20, backgroundColor: ac.containerLow, alignItems: 'center', justifyContent: 'center' },
  kpiWell: { flexDirection: 'row', gap: 8, backgroundColor: ac.containerLow, borderRadius: ar.lg, padding: 10 },
  kpi: { flex: 1, minWidth: 0, backgroundColor: ac.card, borderRadius: ar.md, padding: 10, gap: 2, ...cardShadow },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiLabel: { flex: 1, fontFamily: af.medium, fontSize: 12, color: ac.textMuted },
  kpiValue: { fontFamily: af.heading, fontSize: 21, color: ac.text, letterSpacing: -0.5 },
  kpiSuffix: { fontFamily: af.medium, fontSize: 13, color: ac.textMuted },
  kpiSub: { fontFamily: af.medium, fontSize: 11, color: ac.success },
  complaintsLink: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ac.card, borderRadius: ar.lg, padding: 12, ...cardShadow },
  complaintsIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: ac.errorContainer, alignItems: 'center', justifyContent: 'center' },
  complaintsTitle: { fontFamily: af.heading, fontSize: 16, color: ac.text },
  complaintsSub: { fontFamily: af.body, fontSize: 12, color: ac.textMuted },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ref: { flex: 1, fontFamily: af.heading, fontSize: 19, color: ac.text, letterSpacing: -0.3 },
  serviceWell: { paddingVertical: 10 },
  service: { fontFamily: af.semibold, fontSize: 15, color: ac.text },
  serviceCat: { fontFamily: af.body, fontSize: 13, color: ac.textMuted },
  people: { flexDirection: 'row', gap: 8, backgroundColor: '#F7F8FF', borderRadius: ar.md, padding: 10 },
  person: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 8, alignItems: 'center' },
  personAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: ac.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  personInitials: { fontFamily: af.bold, fontSize: 13, color: ac.primary },
  personRole: { fontFamily: af.medium, fontSize: 11, color: ac.textMuted, letterSpacing: 0.4 },
  personName: { fontFamily: af.semibold, fontSize: 14, color: ac.text },
  cityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  city: { fontFamily: af.semibold, fontSize: 15, color: ac.text },
  updated: { fontFamily: af.body, fontSize: 12, color: ac.textMuted },
  schedWell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sched: { flex: 1, minWidth: 0, fontFamily: af.semibold, fontSize: 13, lineHeight: 18, color: ac.text },
  agreed: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '50%' },
  agreedLabel: { fontFamily: af.semibold, fontSize: 13, color: ac.textMuted },
  agreedValue: { fontFamily: af.heading, fontSize: 19, color: ac.primary },
  lightBtn: { backgroundColor: ac.containerLow },
  readOnly: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ac.containerHigh, borderRadius: ar.lg, padding: 14 },
  readOnlyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: ac.primary, alignItems: 'center', justifyContent: 'center' },
  readOnlyTitle: { fontFamily: af.semibold, fontSize: 14, color: ac.text },
  readOnlySub: { fontFamily: af.body, fontSize: 12, color: ac.textMuted },
  readOnlyChip: { backgroundColor: ac.card, borderRadius: ar.full, paddingHorizontal: 10, paddingVertical: 4 },
  readOnlyChipText: { fontFamily: af.bold, fontSize: 12, color: ac.success, letterSpacing: 0.4 },
});
