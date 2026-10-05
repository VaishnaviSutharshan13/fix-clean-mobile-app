import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import type { ComplaintStatus } from '../../types/admin';
import {
  COMPLAINT_ACCENT,
  COMPLAINT_CATEGORY_LABEL,
  COMPLAINT_FILTERS,
  COMPLAINT_STATUS_META,
  truncate,
} from '../../utils/admin';
import { formatDateTime } from '../../utils/dates';
import { getFriendlyErrorMessage, getInitials } from '../../utils/helpers';

// Complaints / Disputes (FR8). The Admin Figma groups complaints with the
// Booking Monitor ("Live Monitor And Complaints", frame 1:2430) and has no
// separate frame, so this screen uses the Booking Monitor card language.
// Real complaints from MongoDB: open → in review → resolved.
export default function Complaints() {
  const [status, setStatus] = useState<ComplaintStatus | undefined>();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, loading, refreshing, reload } = useAsync(
    () => adminService.complaints(status, query || undefined),
    [status, query],
  );
  useFocusPolling(() => void reload(true));

  const counts = data?.counts;
  const options = COMPLAINT_FILTERS.map((f) => ({ key: f.key, label: f.label, count: counts?.[f.key ?? 'all'] }));

  return (
    <AdminShell section="Live Monitor And Complaints" tab="bookings" refreshing={refreshing} onRefresh={() => reload(true)}>
      <BackLink label="Back to Booking Monitor" onPress={() => router.navigate('/admin/booking-monitoring')} />
      <PageTitle title="Complaints & Disputes" live subtitle="Customer escalations about bookings" />

      <FilterChips options={options} value={status} onChange={setStatus} />

      <View style={styles.kpiWell}>
        <Kpi label="Open" value={counts?.open ?? 0} color={ac.errorStrong} icon="alert-circle-outline" />
        <Kpi label="In Review" value={counts?.in_review ?? 0} color={ac.tertiary} icon="search-outline" />
        <Kpi label="Resolved" value={counts?.resolved ?? 0} color={ac.success} icon="checkmark-done-outline" />
      </View>

      <SearchField value={search} onChangeText={setSearch} placeholder="Search reference, subject or name" />

      {error ? <FormMessage message={getFriendlyErrorMessage(error)} /> : null}

      {loading && !data ? (
        <Loading message="Loading complaints…" />
      ) : data && data.items.length === 0 ? (
        <StateView
          icon="happy-outline"
          title="No complaints here"
          message={query || status ? 'Try another filter or search.' : 'Customer complaints about bookings appear here.'}
        />
      ) : (
        data?.items.map((c) => (
          <ACard key={c.id} accent={COMPLAINT_ACCENT[c.status]}>
            <View style={styles.head}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={COMPLAINT_ACCENT[c.status]} />
              <Text style={styles.ref}>#{c.reference}</Text>
              <StatusPill meta={COMPLAINT_STATUS_META[c.status]} />
            </View>
            <Well style={styles.subjectWell}>
              <Text style={styles.subject}>{c.subject}</Text>
              <Text style={styles.category}>{COMPLAINT_CATEGORY_LABEL[c.category].toUpperCase()}</Text>
            </Well>
            <Text style={styles.description}>{truncate(c.description, 150)}</Text>
            <View style={styles.people}>
              {[
                ['CUSTOMER', c.customer.name],
                ['PROVIDER', c.provider.name],
              ].map(([role, name]) => (
                <View key={role} style={styles.person}>
                  <View style={styles.personAvatar}>
                    <Text style={styles.personInitials}>{getInitials(name!)}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.personRole}>{role}</Text>
                    <Text style={styles.personName} numberOfLines={2}>
                      {name}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Well style={styles.metaWell}>
              <Ionicons name="receipt-outline" size={16} color={ac.text} />
              <Text style={styles.meta}>
                {c.booking ? `Booking ${c.booking.reference}` : 'Booking removed'} •{' '}
                {c.resolvedAt ? `Resolved ${formatDateTime(c.resolvedAt)}` : `Submitted ${formatDateTime(c.createdAt)}`}
              </Text>
            </Well>
            <AButton
              label={c.status === 'resolved' ? 'View Details' : 'Manage Complaint'}
              tone={c.status === 'resolved' ? 'light' : 'primary'}
              iconRight="arrow-forward"
              small
              onPress={() => router.push({ pathname: '/admin/complaint-details', params: { id: c.id } })}
              accessibilityLabel={`Open complaint ${c.reference}: ${c.subject}`}
            />
          </ACard>
        ))
      )}
    </AdminShell>
  );
}

function Kpi({ label, value, color, icon }: { label: string; value: number; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiHead}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.kpiLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.kpiValue, { color }]}>{String(value).padStart(2, '0')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  kpiWell: { flexDirection: 'row', gap: 8, backgroundColor: ac.containerLow, borderRadius: ar.lg, padding: 10 },
  kpi: { flex: 1, minWidth: 0, backgroundColor: ac.card, borderRadius: ar.md, padding: 10, gap: 2, ...cardShadow },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiLabel: { flex: 1, fontFamily: af.medium, fontSize: 12, color: ac.textMuted },
  kpiValue: { fontFamily: af.heading, fontSize: 24, letterSpacing: -0.5 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ref: { flex: 1, fontFamily: af.heading, fontSize: 19, color: ac.text, letterSpacing: -0.3 },
  subjectWell: { gap: 4, paddingVertical: 10 },
  subject: { fontFamily: af.semibold, fontSize: 15, lineHeight: 21, color: ac.text },
  category: { fontFamily: af.bold, fontSize: 11, color: ac.error, letterSpacing: 0.5 },
  description: { fontFamily: af.body, fontSize: 13, lineHeight: 19, color: ac.textMuted },
  people: { flexDirection: 'row', gap: 8, backgroundColor: '#F7F8FF', borderRadius: ar.md, padding: 10 },
  person: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 8, alignItems: 'center' },
  personAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: ac.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  personInitials: { fontFamily: af.bold, fontSize: 12, color: ac.primary },
  personRole: { fontFamily: af.medium, fontSize: 11, color: ac.textMuted, letterSpacing: 0.4 },
  personName: { fontFamily: af.semibold, fontSize: 13, color: ac.text },
  metaWell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { flex: 1, fontFamily: af.medium, fontSize: 12, color: ac.text },
});
