import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AdminShell from '../../components/admin/AdminShell';
import InfoRow from '../../components/admin/InfoRow';
import { ACard, AButton, BackLink, Tag, Well } from '../../components/admin/Primitives';
import StatusPill from '../../components/admin/StatusPill';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import { ac, af, ar } from '../../constants/adminTheme';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services/adminService';
import type { AdminUserDetails } from '../../types/admin';
import { ACTIVE_META, ROLE_META, shortRef, SUSPENDED_META, VERIFICATION_META } from '../../utils/admin';
import { CATEGORY_META, confirmAction } from '../../utils/display';
import { formatDateTime } from '../../utils/dates';
import { getFriendlyErrorMessage, getInitials } from '../../utils/helpers';

const ROLE_PREFIX = { customer: 'CST', provider: 'PRO', admin: 'ADM' } as const;

// User Details (no dedicated Figma frame; styled like User Management 1:2209
// and Verification Detail Review 1:2050). Admins can suspend or reactivate
// customer and provider accounts; accounts are never deleted. The server
// refuses changes to the admin's own account and to other administrators.
export default function UserDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload } = useAsync(() => adminService.user(id), [id]);
  const [local, setLocal] = useState<AdminUserDetails>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>();

  useEffect(() => setLocal(data), [data]);
  const user = local ?? data;

  if (loading && !data) return <Loading message="Loading user…" />;
  if (!user) {
    return (
      <AdminShell title="User Details">
        <StateView title="Couldn't load this user" message={getFriendlyErrorMessage(error)} actionLabel="Try again" onAction={() => reload()} />
      </AdminShell>
    );
  }

  const toggleActive = async () => {
    const suspending = user.isActive;
    const ok = await confirmAction(
      suspending ? 'Suspend account?' : 'Reactivate account?',
      suspending
        ? `${user.name} will be signed out and unable to sign in.${user.role === 'provider' ? ' They will also be hidden from customers.' : ''} Existing bookings are kept.`
        : `${user.name} will be able to sign in again.`,
      suspending ? 'Suspend' : 'Reactivate',
    );
    if (!ok) return;
    setSaving(true);
    setMessage(undefined);
    try {
      const updated = await adminService.setUserActive(user.id, !suspending);
      setLocal(updated);
      setMessage({ tone: 'success', text: updated.isActive ? 'Account reactivated.' : 'Account suspended.' });
    } catch (err) {
      setMessage({ tone: 'error', text: getFriendlyErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const stats = user.bookingStats;
  const roleColor = user.role === 'provider' ? ac.tertiary : user.role === 'admin' ? ac.dark : ac.primary;

  return (
    <AdminShell
      title="User Details"
      refreshing={refreshing}
      onRefresh={() => reload(true)}
      footer={
        user.canChangeStatus ? (
          <AButton
            label={user.isActive ? 'Suspend Account' : 'Reactivate Account'}
            tone={user.isActive ? 'danger' : 'success'}
            icon={user.isActive ? 'ban-outline' : 'refresh-circle-outline'}
            onPress={toggleActive}
            loading={saving}
            style={styles.flex}
          />
        ) : undefined
      }
    >
      <BackLink
        label="Back to Users"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/user-management'))}
        right={<Tag label={shortRef(ROLE_PREFIX[user.role], user.id)} fg={ac.textMuted} />}
      />

      {message ? <FormMessage tone={message.tone} message={message.text} /> : null}

      <ACard>
        <View style={styles.top}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={[styles.roleLine, { color: roleColor }]}>{ROLE_META[user.role].label.toUpperCase()}</Text>
          </View>
          <StatusPill meta={user.isActive ? ACTIVE_META : SUSPENDED_META} />
        </View>
        <Well>
          <InfoRow icon="mail-outline" value={user.email} />
          <InfoRow icon="call-outline" value={user.phone} />
          <InfoRow icon="calendar-outline" value={`Joined ${formatDateTime(user.createdAt)}`} />
          {user.suspendedAt ? <InfoRow icon="ban-outline" value={`Suspended ${formatDateTime(user.suspendedAt)}`} /> : null}
        </Well>
      </ACard>

      {user.provider ? (
        <ACard>
          <View style={styles.headRow}>
            <Text style={styles.cardTitle}>Provider profile</Text>
            <StatusPill meta={VERIFICATION_META[user.provider.verificationStatus]} />
          </View>
          <Well>
            <InfoRow icon={CATEGORY_META[user.provider.category].icon} value={`${CATEGORY_META[user.provider.category].label} Specialist`} />
            <InfoRow icon="location-outline" value={user.provider.serviceArea} />
          </Well>
          <AButton
            label="Open verification details"
            tone="light"
            small
            iconRight="arrow-forward"
            onPress={() => router.push({ pathname: '/admin/verification-details', params: { id: user.id } })}
          />
        </ACard>
      ) : null}

      {user.role !== 'admin' ? (
        <ACard>
          <Text style={styles.cardTitle}>{user.role === 'provider' ? 'Jobs' : 'Bookings'}</Text>
          <View style={styles.statRow}>
            <Stat label="Total" value={stats.total} />
            <Stat label="Active" value={stats.active} />
            <Stat label="Completed" value={stats.completed} />
            <Stat label="Cancelled / declined" value={stats.cancelledOrDeclined} />
          </View>
          <View style={styles.complaints}>
            <Ionicons name="chatbox-ellipses-outline" size={17} color={ac.textMuted} />
            <Text style={styles.complaintsText}>
              {user.complaintCount} complaint{user.complaintCount === 1 ? '' : 's'} {user.role === 'provider' ? 'about this provider' : 'filed'}
            </Text>
          </View>
        </ACard>
      ) : null}

      {!user.canChangeStatus ? (
        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={16} color={ac.textMuted} />
          <Text style={styles.noteText}>Administrator accounts (including your own) can&apos;t be suspended from the app.</Text>
        </View>
      ) : null}
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: ac.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: af.heading, fontSize: 20, color: ac.primary },
  name: { fontFamily: af.heading, fontSize: 20, lineHeight: 25, color: ac.text, letterSpacing: -0.4 },
  roleLine: { fontFamily: af.bold, fontSize: 12, letterSpacing: 0.6, marginTop: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontFamily: af.heading, fontSize: 18, color: ac.text, letterSpacing: -0.3 },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', backgroundColor: ac.containerLow, borderRadius: ar.md, paddingVertical: 12, paddingHorizontal: 4 },
  statValue: { fontFamily: af.heading, fontSize: 20, color: ac.text },
  statLabel: { fontFamily: af.medium, fontSize: 11, color: ac.textMuted, textAlign: 'center' },
  complaints: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  complaintsText: { fontFamily: af.medium, fontSize: 14, color: ac.text },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12 },
  noteText: { flex: 1, fontFamily: af.body, fontSize: 13, color: ac.textMuted },
});
