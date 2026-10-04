import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import ProviderHeader from '../../components/provider/ProviderHeader';
import ProviderProfileStrip from '../../components/provider/ProviderProfileStrip';
import ProviderTabBar from '../../components/provider/ProviderTabBar';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { useFocusPolling } from '../../hooks/useFocusPolling';
import { providerPortalService } from '../../services/providerPortalService';
import type { ProviderJob } from '../../types/providerJob';
import { CATEGORY_META, confirmAction, formatBookingDate, formatTimeSlot, sriLankaToday } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';
import { filterJobsByDay, relativeDayLabel, type JobDayFilter } from '../../utils/providerSchedule';

const FILTERS: { key: JobDayFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
];

// Booking Requests (Milestone 02 Variant A / Figma "Requests"): scannable cards
// for every request waiting for this provider (FR4). Before acceptance only
// the city is shown — the exact address is protected by the API (NFR5).
export default function BookingRequests() {
  const { data, error, loading, refreshing, reload } = useAsync(
    () => Promise.all([providerPortalService.me(), providerPortalService.jobs('requests')]),
    [],
  );
  useFocusPolling(() => void reload(true));

  const [filter, setFilter] = useState<JobDayFilter>('all');
  const [decliningId, setDecliningId] = useState<string>();
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string }>();

  if (loading && !data) return <Loading message="Loading requests…" />;

  const [account, requests = []] = data ?? [];
  const today = sriLankaToday().date;
  const visible = filterJobsByDay(requests, filter, today);

  const decline = async (job: ProviderJob) => {
    const ok = await confirmAction(
      'Decline request?',
      `${job.customer.name} will be told you can't take ${job.reference}.`,
      'Decline',
    );
    if (!ok) return;
    setDecliningId(job.id);
    setActionMessage(undefined);
    try {
      await providerPortalService.act(job.id, 'decline');
      setActionMessage({ tone: 'success', text: `Request ${job.reference} declined. The customer has been notified.` });
      await reload(true);
    } catch (err) {
      setActionMessage({
        tone: 'error',
        text: getFriendlyErrorMessage(err, { 409: 'This request was already updated. The list has been refreshed.' }),
      });
      await reload(true);
    } finally {
      setDecliningId(undefined);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ProviderHeader title="Requests" hasAlerts={requests.length > 0} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
      >
        {account ? <ProviderProfileStrip account={account} variant="live" /> : null}
        {error ? <FormMessage message={getFriendlyErrorMessage(error)} /> : null}
        {actionMessage ? <FormMessage message={actionMessage.text} tone={actionMessage.tone} /> : null}

        <View>
          <View style={styles.queueRow}>
            <Text style={styles.queueTitle}>Queue</Text>
            <View style={styles.pendingChip}>
              <Text style={styles.pendingText}>{requests.length} Pending</Text>
            </View>
          </View>
          <Text style={styles.queueSub}>Accept or decline promptly so customers can plan their day.</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            const count = filterJobsByDay(requests, f.key, today).length;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filter, active && styles.filterActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
                {count > 0 ? (
                  <View style={[styles.filterCount, active && styles.filterCountActive]}>
                    <Text style={[styles.filterCountText, active && styles.filterTextActive]}>{count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={36} color={colors.textSubtle} />
            <Text style={styles.emptyTitle}>
              {requests.length === 0 ? 'No pending requests' : `No requests for ${filter}`}
            </Text>
            <Text style={styles.emptyBody}>
              {account?.verificationStatus === 'verified'
                ? 'New customer bookings will appear here automatically.'
                : 'Customers can book you once your profile has been verified.'}
            </Text>
          </View>
        ) : (
          visible.map((job) => {
            const rel = relativeDayLabel(job.scheduledDate, today);
            const soon = rel !== '';
            return (
              <View key={job.id} style={styles.card} testID={`request-${job.reference}`}>
                <View style={[styles.cardBar, { backgroundColor: soon ? colors.orange : '#BFDCF5' }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <View style={styles.inline}>
                      <Text style={styles.ref}>#{job.reference}</Text>
                      <View style={[styles.tag, soon ? styles.tagSoon : styles.tagStandard]}>
                        <Ionicons
                          name={soon ? 'flame-outline' : 'checkbox-outline'}
                          size={12}
                          color={soon ? '#8A4B00' : colors.primaryDark}
                        />
                        <Text style={[styles.tagText, { color: soon ? '#8A4B00' : colors.primaryDark }]}>
                          {soon ? 'PRIORITY' : 'STANDARD'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.priceBlock}>
                      <Text style={styles.price}>{formatLKR(job.pricing.total)}</Text>
                      <Text style={styles.priceLabel}>Est. total</Text>
                    </View>
                  </View>

                  <View style={styles.serviceRow}>
                    <View style={styles.serviceIcon}>
                      <Ionicons name={CATEGORY_META[job.service.category].icon} size={20} color={colors.primary} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.serviceName}>{job.service.name}</Text>
                      <Text style={styles.customer}>
                        Customer: <Text style={styles.customerName}>{job.customer.name}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.well}>
                    <View style={styles.inline}>
                      <Ionicons name="time-outline" size={16} color={colors.primary} />
                      <Text style={styles.wellText}>
                        {formatBookingDate(job.scheduledDate)} • {formatTimeSlot(job.timeSlot)}
                        {rel ? <Text style={styles.wellMuted}> ({rel})</Text> : null}
                      </Text>
                    </View>
                    <View style={styles.inline}>
                      <Ionicons name="location-outline" size={16} color={colors.primary} />
                      <Text style={styles.wellText}>{job.location.city}</Text>
                    </View>
                    <View style={styles.inline}>
                      <Ionicons name="lock-closed-outline" size={13} color={colors.primary} />
                      <Text style={styles.lockText}>Exact address shared after you accept</Text>
                    </View>
                  </View>

                  <View style={styles.note}>
                    <Ionicons name="document-text-outline" size={15} color={colors.textMuted} />
                    <Text style={styles.noteText} numberOfLines={2}>
                      {job.problemDescription}
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.viewButton, !soon && styles.viewButtonLight, pressed && { opacity: 0.9 }]}
                    onPress={() => router.push({ pathname: '/provider/booking-details', params: { id: job.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${job.reference}`}
                  >
                    <Text style={[styles.viewText, !soon && styles.viewTextLight]}>VIEW DETAILS</Text>
                    <Ionicons name="arrow-forward" size={18} color={soon ? colors.white : colors.primary} />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.declineButton, pressed && { opacity: 0.85 }]}
                    onPress={() => decline(job)}
                    disabled={decliningId === job.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Decline ${job.reference}`}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                    <Text style={styles.declineText}>{decliningId === job.id ? 'Declining…' : 'Decline'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <ProviderTabBar active="requests" requestCount={requests.length} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.lavender },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  queueTitle: { fontSize: 21, fontWeight: '600', color: colors.text },
  pendingChip: { backgroundColor: colors.orange, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  pendingText: { fontSize: 12, fontWeight: '700', color: '#4A2800' },
  queueSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  filters: { gap: spacing.sm },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    minHeight: 40,
    borderRadius: radius.full,
    backgroundColor: colors.lavenderStrong,
  },
  filterActive: { backgroundColor: colors.navy },
  filterText: { fontSize: 14, fontWeight: '600', color: colors.text },
  filterTextActive: { color: colors.white },
  filterCount: { backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 6 },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 12, fontWeight: '700', color: colors.text },
  empty: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  cardBar: { height: 6 },
  cardBody: { padding: spacing.lg, gap: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ref: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagSoon: { backgroundColor: colors.orangeSoft },
  tagStandard: { backgroundColor: colors.lavenderStrong },
  tagText: { fontSize: 11, fontWeight: '800' },
  priceBlock: { alignItems: 'flex-end' },
  price: { fontSize: 19, fontWeight: '600', color: colors.primary },
  priceLabel: { fontSize: 11, color: colors.textMuted },
  serviceRow: { flexDirection: 'row', gap: spacing.md },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: { fontSize: 19, fontWeight: '500', color: colors.text },
  customer: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  customerName: { fontWeight: '700', color: colors.text },
  well: { backgroundColor: colors.lavender, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  wellText: { fontSize: 14, color: colors.text, flexShrink: 1 },
  wellMuted: { color: colors.textMuted },
  lockText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  noteText: { flex: 1, fontSize: 13, color: colors.textMuted },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  viewButtonLight: { backgroundColor: colors.lavenderStrong },
  viewText: { fontSize: 16, fontWeight: '600', color: colors.white, letterSpacing: 0.3 },
  viewTextLight: { color: colors.primary },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  declineText: { fontSize: 15, fontWeight: '600', color: colors.danger },
});
