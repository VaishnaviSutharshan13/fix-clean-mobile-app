import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import AdminShell from '../../components/admin/AdminShell';
import { ACard, AButton, BackLink, PageTitle, Well } from '../../components/admin/Primitives';
import SearchField from '../../components/admin/SearchField';
import StatusPill from '../../components/admin/StatusPill';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import { ac, af, ar, cardShadow } from '../../constants/adminTheme';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../hooks/useAuth';
import { useFocusPolling } from '../../hooks/useFocusPolling';
import { adminService } from '../../services/adminService';
import type { AdminUserListItem } from '../../types/admin';
import {
  ACTIVE_META,
  ROLE_META,
  shortRef,
  SUSPENDED_META,
  USER_FILTERS,
  userFilterQuery,
  VERIFICATION_META,
  type UserFilter,
} from '../../utils/admin';
import { CATEGORY_META, confirmAction, formatRelative } from '../../utils/display';
import { getFriendlyErrorMessage, getInitials } from '../../utils/helpers';

const isFilter = (v: unknown): v is UserFilter => USER_FILTERS.some((f) => f.key === v);
const ROLE_PREFIX = { customer: 'CST', provider: 'PRO', admin: 'ADM' } as const;
const FILTER_ICON = { all: 'apps-outline', customer: 'people-outline', provider: 'construct-outline', admin: 'shield-outline', suspended: 'ban-outline' } as const;

// User Management — Admin Figma frame 1:2209. Real accounts from MongoDB with
// role / status filters, search and suspend / reactivate. Password hashes are
// never sent to the app; accounts are never deleted.
export default function UserManagement() {
  const { user: me } = useAuth();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<UserFilter>(isFilter(params.filter) ? params.filter : 'all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string>();
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>();

  useEffect(() => {
    if (isFilter(params.filter)) setFilter(params.filter);
  }, [params.filter]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, loading, refreshing, reload } = useAsync(
    () => adminService.users({ ...userFilterQuery(filter), search: query || undefined }),
    [filter, query],
  );
  useFocusPolling(() => void reload(true));

  const toggleActive = async (u: AdminUserListItem) => {
    const suspending = u.isActive;
    const ok = await confirmAction(
      suspending ? 'Suspend account?' : 'Reactivate account?',
      suspending
        ? `${u.name} will be signed out and unable to sign in.${u.role === 'provider' ? ' They will also be hidden from customers.' : ''} Existing bookings are kept.`
        : `${u.name} will be able to sign in again.`,
      suspending ? 'Suspend' : 'Reactivate',
    );
    if (!ok) return;
    setBusyId(u.id);
    setMessage(undefined);
    try {
      await adminService.setUserActive(u.id, !suspending);
      setMessage({ tone: 'success', text: `${u.name} ${suspending ? 'suspended' : 'reactivated'}.` });
      await reload(true);
    } catch (err) {
      setMessage({ tone: 'error', text: getFriendlyErrorMessage(err) });
    } finally {
      setBusyId(undefined);
    }
  };

  const counts = data?.counts;

  return (
    <AdminShell section="User Directory" tab="users" refreshing={refreshing} onRefresh={() => reload(true)}>
      <BackLink label="Back to Dashboard" caps onPress={() => router.navigate('/admin/dashboard')} />
      <PageTitle
        title="User Management"
        subtitle="Directory & access control for every account"
        right={
          <View style={styles.totalPill}>
            <View style={styles.totalDot} />
            <Text style={styles.totalText}>{counts?.all ?? '–'} Total</Text>
          </View>
        }
      />

      <View style={styles.tiles}>
        <View style={styles.tile}>
          <View style={[styles.tileIcon, { backgroundColor: ac.containerHigh }]}>
            <Ionicons name="person-outline" size={20} color={ac.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.tileValue}>{counts?.customer ?? '–'}</Text>
            <Text style={styles.tileLabel} numberOfLines={1}>
              Customers Registered
            </Text>
          </View>
        </View>
        <View style={styles.tile}>
          <View style={[styles.tileIcon, { backgroundColor: ac.tertiaryContainer }]}>
            <Ionicons name="construct-outline" size={20} color={ac.tertiary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.tileValue}>{counts?.provider ?? '–'}</Text>
            <Text style={styles.tileLabel} numberOfLines={1}>
              Service Providers
            </Text>
          </View>
        </View>
      </View>

      <SearchField value={search} onChangeText={setSearch} placeholder="Search name, phone, email…" />

      <View style={styles.segmentWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segment}>
          {USER_FILTERS.map((f) => {
            const selected = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.segItem, selected && styles.segItemOn]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${f.label} (${counts?.[f.key] ?? 0})`}
              >
                <Ionicons name={FILTER_ICON[f.key]} size={17} color={selected ? ac.primary : ac.textMuted} />
                <Text style={[styles.segText, selected && styles.segTextOn]}>
                  {f.label} ({counts?.[f.key] ?? 0})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {message ? <FormMessage tone={message.tone} message={message.text} /> : null}
      {error ? <FormMessage message={getFriendlyErrorMessage(error)} /> : null}

      {loading && !data ? (
        <Loading message="Loading users…" />
      ) : data && data.items.length === 0 ? (
        <StateView icon="people-outline" title="No users found" message={query ? 'Try a different search.' : undefined} />
      ) : (
        <>
          {data && data.items.length >= 100 ? (
            <Text style={styles.note}>Showing the 100 newest accounts. Use search to narrow the list.</Text>
          ) : null}
          {data?.items.map((u) => {
            const canChange = u.role !== 'admin' && u.id !== me?.id;
            const roleColor = u.role === 'provider' ? ac.tertiary : u.role === 'admin' ? ac.dark : ac.primary;
            return (
              <ACard key={u.id}>
                <View style={styles.top}>
                  <View>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(u.name)}</Text>
                    </View>
                    {u.isActive ? (
                      <View style={styles.avatarTick}>
                        <Ionicons name="checkmark" size={10} color={ac.onPrimary} />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{u.name}</Text>
                      <StatusPill meta={u.isActive ? ACTIVE_META : SUSPENDED_META} />
                    </View>
                    <Text style={[styles.roleLine, { color: roleColor }]}>
                      {ROLE_META[u.role].label.toUpperCase()} • {shortRef(ROLE_PREFIX[u.role], u.id)}
                    </Text>
                  </View>
                </View>

                <Well>
                  {u.provider ? (
                    <View style={styles.wellRow}>
                      <Ionicons name={CATEGORY_META[u.provider.category].icon} size={16} color={ac.tertiary} />
                      <Text style={styles.wellStrong}>
                        {CATEGORY_META[u.provider.category].label} Specialist • {u.provider.serviceArea}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.wellRow}>
                    <Ionicons name="call-outline" size={16} color={ac.textMuted} />
                    <Text style={styles.wellText}>{u.phone}</Text>
                  </View>
                  <View style={styles.wellRow}>
                    <Ionicons name="mail-outline" size={16} color={ac.textMuted} />
                    <Text style={styles.wellText}>{u.email}</Text>
                  </View>
                  <View style={styles.wellRow}>
                    <Ionicons
                      name={u.provider ? 'shield-checkmark-outline' : 'time-outline'}
                      size={16}
                      color={u.provider?.verificationStatus === 'verified' ? ac.success : ac.textMuted}
                    />
                    <Text
                      style={[
                        styles.wellText,
                        u.provider && { color: VERIFICATION_META[u.provider.verificationStatus].fg, fontFamily: af.semibold },
                      ]}
                    >
                      {u.provider
                        ? `Verification: ${VERIFICATION_META[u.provider.verificationStatus].label}`
                        : `Member since ${formatRelative(u.createdAt).toLowerCase()}`}
                    </Text>
                  </View>
                </Well>

                <View style={styles.actions}>
                  <AButton
                    label="View Details"
                    tone="light"
                    icon="eye-outline"
                    small
                    style={styles.flex}
                    onPress={() => router.push({ pathname: '/admin/user-details', params: { id: u.id } })}
                    accessibilityLabel={`View details for ${u.name}`}
                  />
                  {canChange ? (
                    <AButton
                      label={u.isActive ? 'Suspend' : 'Reactivate'}
                      tone={u.isActive ? 'dangerSoft' : 'success'}
                      icon={u.isActive ? 'ban-outline' : 'refresh-circle-outline'}
                      small
                      style={styles.flex}
                      loading={busyId === u.id}
                      disabled={!!busyId && busyId !== u.id}
                      onPress={() => toggleActive(u)}
                      accessibilityLabel={`${u.isActive ? 'Suspend' : 'Reactivate'} ${u.name}`}
                    />
                  ) : null}
                </View>
              </ACard>
            );
          })}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  totalPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ac.containerHigh, borderRadius: ar.full, paddingHorizontal: 12, paddingVertical: 5 },
  totalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ac.success },
  totalText: { fontFamily: af.bold, fontSize: 13, color: ac.primary },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ac.card, borderRadius: ar.lg, padding: 12, ...cardShadow },
  tileIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontFamily: af.heading, fontSize: 20, color: ac.text },
  tileLabel: { fontFamily: af.medium, fontSize: 12, color: ac.textMuted },
  segmentWrap: { backgroundColor: ac.containerHigh, borderRadius: ar.lg, padding: 4 },
  segment: { gap: 4 },
  segItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 40, borderRadius: ar.md },
  segItemOn: { backgroundColor: ac.card, ...cardShadow },
  segText: { fontFamily: af.medium, fontSize: 14, color: ac.textMuted },
  segTextOn: { fontFamily: af.semibold, color: ac.primary },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: ac.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: af.heading, fontSize: 18, color: ac.primary },
  avatarTick: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ac.success,
    borderWidth: 2,
    borderColor: ac.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', columnGap: 8, rowGap: 4 },
  name: { flexShrink: 1, fontFamily: af.headingSemi, fontSize: 19, lineHeight: 24, color: ac.text, letterSpacing: -0.4 },
  roleLine: { fontFamily: af.bold, fontSize: 12, letterSpacing: 0.6, marginTop: 2 },
  wellRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wellStrong: { flex: 1, fontFamily: af.semibold, fontSize: 13, color: ac.text },
  wellText: { flex: 1, fontFamily: af.body, fontSize: 13, color: ac.textMuted },
  actions: { flexDirection: 'row', gap: 10 },
  note: { fontFamily: af.body, fontSize: 12, color: ac.textMuted, textAlign: 'center' },
});
