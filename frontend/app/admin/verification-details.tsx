import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import AdminShell from '../../components/admin/AdminShell';
import InfoRow from '../../components/admin/InfoRow';
import { ACard, AButton, BackLink, IconTile, Tag, Well } from '../../components/admin/Primitives';
import StatusPill from '../../components/admin/StatusPill';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import { ac, af, ar } from '../../constants/adminTheme';
import { useAsync } from '../../hooks/useAsync';
import { useFocusPolling } from '../../hooks/useFocusPolling';
import { adminService } from '../../services/adminService';
import type { AdminProviderDetails, CheckKey } from '../../types/admin';
import { CHECK_ITEMS, confirmedCheckCount, formatExperience, shortRef, SUSPENDED_META, VERIFICATION_META } from '../../utils/admin';
import { CATEGORY_META } from '../../utils/display';
import { formatDateTime, formatTimeSlot } from '../../utils/dates';
import { formatLKR, getFriendlyErrorMessage, getInitials } from '../../utils/helpers';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Verification Detail Review — Admin Figma frame 1:2050. Shows everything the
// provider submitted (account, trade, district, experience, services, prices,
// visiting fee, availability) and the admin checklist (identity, contact,
// experience), saved on the server. The app collects no ID documents, so the
// Figma "Submitted Credentials" area shows a truthful "none uploaded" state.
export default function VerificationDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload } = useAsync(() => adminService.provider(id), [id]);
  const [local, setLocal] = useState<AdminProviderDetails>();
  const [savingCheck, setSavingCheck] = useState<CheckKey>();
  const [checkError, setCheckError] = useState<string>();

  useEffect(() => setLocal(data), [data]);
  const provider = local ?? data;
  // Picks up the provider's own edits (e.g. new services) and review results.
  useFocusPolling(() => void reload(true), 30_000);

  if (loading && !data) return <Loading message="Loading application…" />;
  if (!provider) {
    return (
      <AdminShell title="Verification Detail Review">
        <StateView
          icon="alert-circle-outline"
          title="Couldn't load this application"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </AdminShell>
    );
  }

  const pending = provider.verificationStatus === 'pending';
  const category = CATEGORY_META[provider.category];
  const checks = confirmedCheckCount(provider.verificationChecks);

  const toggleCheck = async (key: CheckKey, value: boolean) => {
    setSavingCheck(key);
    setCheckError(undefined);
    try {
      setLocal(await adminService.updateChecks(provider.id, { [key]: value }));
    } catch (err) {
      setCheckError(getFriendlyErrorMessage(err));
    } finally {
      setSavingCheck(undefined);
    }
  };

  const openConfirmation = (action: 'approve' | 'reject') =>
    router.push({ pathname: '/admin/approval-confirmation', params: { id: provider.id, action } });

  return (
    <AdminShell
      title="Verification Detail Review"
      refreshing={refreshing}
      onRefresh={() => reload(true)}
      footer={
        pending ? (
          <>
            <AButton label="Reject" tone="danger" caps icon="close" onPress={() => openConfirmation('reject')} style={styles.reject} />
            <AButton
              label="Approve Pro"
              tone="success"
              caps
              icon="checkmark-circle-outline"
              onPress={() => openConfirmation('approve')}
              disabled={!provider.approval.ready}
              style={styles.approve}
              accessibilityLabel="Approve"
              accessibilityHint={provider.approval.ready ? undefined : 'Resolve the listed items first'}
            />
          </>
        ) : undefined
      }
    >
      <BackLink
        label="Back to Verifications"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/verification-requests'))}
        right={<Tag label={shortRef('APP', provider.id)} fg={ac.textMuted} />}
      />

      {error ? <FormMessage message={getFriendlyErrorMessage(error)} /> : null}

      {/* Profile */}
      <ACard>
        <View style={styles.profile}>
          <View>
            <View style={styles.photo}>
              <Text style={styles.photoText}>{getInitials(provider.name)}</Text>
            </View>
            <View style={styles.tradeBadge}>
              <Ionicons name={category.icon} size={13} color={ac.primary} />
            </View>
          </View>
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{provider.name}</Text>
              {pending ? (
                <View style={styles.pendingChip}>
                  <Text style={styles.pendingChipText}>PENDING</Text>
                </View>
              ) : (
                <StatusPill meta={VERIFICATION_META[provider.verificationStatus]} />
              )}
            </View>
            <Text style={styles.trade}>
              {category.label} • {formatExperience(provider.experienceYears)} Exp
            </Text>
            <View style={styles.inline}>
              <Ionicons name="location-outline" size={15} color={ac.error} />
              <Text style={styles.district}>{provider.serviceArea} district</Text>
            </View>
            {!provider.accountActive ? (
              <View style={styles.suspended}>
                <StatusPill meta={SUSPENDED_META} />
              </View>
            ) : null}
          </View>
        </View>
        <Well>
          <InfoRow icon="phone-portrait-outline" value={provider.phone} />
          <InfoRow icon="mail-outline" value={provider.email} />
          <InfoRow icon="calendar-outline" value={`Submitted ${formatDateTime(provider.submittedAt)}`} />
          <InfoRow icon="ribbon-outline" value={provider.headline} />
        </Well>
        {provider.bio ? <Text style={styles.bio}>{provider.bio}</Text> : null}
      </ACard>

      {/* Review outcome for reviewed providers */}
      {provider.verificationStatus === 'verified' ? (
        <View style={[styles.outcome, { backgroundColor: ac.successSoft }]}>
          <Ionicons name="shield-checkmark" size={22} color={ac.success} />
          <View style={styles.flex}>
            <Text style={[styles.outcomeTitle, { color: ac.success }]}>Verified provider</Text>
            <Text style={styles.outcomeBody}>
              Approved {provider.verifiedAt ? formatDateTime(provider.verifiedAt) : ''}
              {provider.reviewedBy ? ` by ${provider.reviewedBy}` : ''}. {provider.bookingStats.total} bookings •{' '}
              {provider.bookingStats.completed} completed.
            </Text>
            {provider.servicesChangedSinceApproval && provider.servicesUpdatedAt ? (
              <Text style={styles.outcomeNote}>
                Services &amp; rates were edited by the provider on {formatDateTime(provider.servicesUpdatedAt)}, after
                approval. Prices stay provider-controlled; review them below.
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      {provider.verificationStatus === 'rejected' ? (
        <View style={[styles.outcome, { backgroundColor: ac.errorContainer }]}>
          <Ionicons name="close-circle" size={22} color={ac.error} />
          <View style={styles.flex}>
            <Text style={[styles.outcomeTitle, { color: ac.onErrorContainer }]}>Application rejected</Text>
            <Text style={styles.outcomeBody}>
              {provider.reviewedAt ? `Reviewed ${formatDateTime(provider.reviewedAt)}` : 'Reviewed'}
              {provider.reviewedBy ? ` by ${provider.reviewedBy}` : ''}.
            </Text>
            <Text style={styles.outcomeBody}>Reason: {provider.rejectionReason ?? 'No reason given.'}</Text>
          </View>
        </View>
      ) : null}

      {/* Submitted credentials (none collected by this app) */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Submitted Credentials</Text>
        <Tag label="0 DOCUMENTS" fg={ac.textMuted} />
      </View>
      <ACard style={styles.docCard}>
        <IconTile icon="document-outline" bg={ac.containerHigh} fg={ac.outline} size={48} />
        <View style={styles.flex}>
          <Text style={styles.docTitle}>No documents uploaded</Text>
          <Text style={styles.docSub}>
            The app does not collect NIC or NVQ files. Confirm identity and experience directly with the provider.
          </Text>
        </View>
      </ACard>

      {/* Services & rates */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Proposed Services &amp; Rates</Text>
        <Tag label={`${provider.services.length} LISTED`} fg={ac.textMuted} />
      </View>
      {provider.services.length === 0 ? (
        <ACard style={styles.docCard}>
          <IconTile icon="alert-circle-outline" bg={ac.tertiaryContainer} fg={ac.tertiary} size={48} />
          <View style={styles.flex}>
            <Text style={styles.docTitle}>No services proposed yet</Text>
            <Text style={styles.docSub}>The provider must add services &amp; rates before they can be approved.</Text>
          </View>
        </ACard>
      ) : (
        provider.services.map((s) => (
          <ACard key={s.id} style={styles.docCard}>
            <IconTile icon={category.icon} bg={category.bg} fg={category.tint} size={48} />
            <View style={styles.flex}>
              <Text style={styles.docTitle}>{s.name}</Text>
              {s.description ? <Text style={styles.docSub}>{s.description}</Text> : null}
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>{formatLKR(s.price)}</Text>
            </View>
          </ACard>
        ))
      )}
      <ACard style={styles.docCard}>
        <IconTile icon="car-outline" size={48} />
        <View style={styles.flex}>
          <Text style={styles.docTitle}>Visiting fee</Text>
          <Text style={styles.docSub}>Added to every booking</Text>
        </View>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{formatLKR(provider.visitFee)}</Text>
        </View>
      </ACard>

      {/* Availability */}
      <ACard>
        <View style={styles.sectionHead}>
          <Text style={styles.cardTitle}>Availability</Text>
          <Tag
            label={provider.availability.isAvailable ? 'ON DUTY' : 'OFF DUTY'}
            bg={provider.availability.isAvailable ? ac.successBright : ac.containerHigh}
            fg={provider.availability.isAvailable ? ac.onSuccessBright : ac.textMuted}
          />
        </View>
        <Well>
          <InfoRow label="Working days" value={provider.availability.workingDays.map((d) => DAY_NAMES[d]).join(', ') || 'None'} />
          <InfoRow label="Windows" value={provider.availability.timeSlots.map((s) => formatTimeSlot(s)).join('\n') || 'None'} />
        </Well>
        <Text style={styles.foot}>
          {provider.availabilityUpdatedAt
            ? `Last saved ${formatDateTime(provider.availabilityUpdatedAt)}`
            : 'Not changed yet (default: every day, all windows)'}
        </Text>
      </ACard>

      {/* Admin verification checklist */}
      <ACard>
        <View style={styles.checklistHead}>
          <Text style={styles.checklistTitle}>Admin Verification Checklist</Text>
          <View style={[styles.verifiedPill, checks < CHECK_ITEMS.length && styles.verifiedPillOff]}>
            <Ionicons name="checkmark" size={14} color={checks === CHECK_ITEMS.length ? ac.onSuccessBright : ac.textMuted} />
            <Text style={[styles.verifiedPillText, checks < CHECK_ITEMS.length && { color: ac.textMuted }]}>
              {checks} / {CHECK_ITEMS.length}
              {'\n'}VERIFIED
            </Text>
          </View>
        </View>
        {CHECK_ITEMS.map((item) => {
          const value = provider.verificationChecks[item.key];
          const busy = savingCheck === item.key;
          return (
            <Pressable
              key={item.key}
              style={styles.check}
              onPress={() => void toggleCheck(item.key, !value)}
              disabled={!pending || !!savingCheck}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: value, disabled: !pending }}
              accessibilityLabel={`${item.label} check confirmed`}
            >
              <View style={[styles.box, value && styles.boxOn, !pending && !value && styles.boxDisabled]}>
                {busy ? (
                  <ActivityIndicator size="small" color={value ? ac.onPrimary : ac.success} />
                ) : value ? (
                  <Ionicons name="checkmark" size={18} color={ac.onPrimary} />
                ) : null}
              </View>
              <View style={styles.flex}>
                <Text style={styles.checkTitle}>{item.label} confirmed</Text>
                <Text style={styles.checkHint}>{item.hint}</Text>
              </View>
            </Pressable>
          );
        })}
        <Text style={styles.foot}>
          These record your own confirmation after reviewing the applicant; no automated identity check is performed.
        </Text>
        {checkError ? <FormMessage message={checkError} /> : null}
      </ACard>

      {/* Approval readiness (validated again on the server) */}
      {pending ? (
        provider.approval.ready ? (
          <FormMessage tone="success" message="All requirements are met. This provider can be approved." />
        ) : (
          <ACard>
            <Text style={styles.cardTitle}>Before approving</Text>
            {provider.approval.problems.map((problem) => (
              <View key={problem} style={styles.problem}>
                <Ionicons name="alert-circle-outline" size={17} color={ac.tertiary} />
                <Text style={styles.problemText}>{problem}</Text>
              </View>
            ))}
          </ACard>
        )
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  suspended: { marginTop: 6 },
  profile: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  photo: { width: 80, height: 80, borderRadius: ar.lg, backgroundColor: ac.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  photoText: { fontFamily: af.heading, fontSize: 28, color: ac.primary },
  tradeBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ac.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ac.containerHigh,
  },
  // Wraps so the status chip drops below very long names at 360px.
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: 8, rowGap: 4 },
  name: { flexShrink: 1, minWidth: 0, fontFamily: af.heading, fontSize: 20, lineHeight: 25, color: ac.text, letterSpacing: -0.4 },
  pendingChip: { backgroundColor: ac.amber, borderRadius: ar.full, paddingHorizontal: 10, paddingVertical: 3 },
  pendingChipText: { fontFamily: af.bold, fontSize: 12, color: ac.onTertiaryContainer, letterSpacing: 0.4 },
  trade: { fontFamily: af.semibold, fontSize: 15, color: ac.primary, marginTop: 4 },
  district: { fontFamily: af.body, fontSize: 13, color: ac.textMuted, flexShrink: 1 },
  bio: { fontFamily: af.body, fontSize: 13, lineHeight: 19, color: ac.textMuted },
  outcome: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: ar.lg },
  outcomeTitle: { fontFamily: af.heading, fontSize: 16 },
  outcomeBody: { fontFamily: af.body, fontSize: 13, lineHeight: 18, color: ac.text, marginTop: 2 },
  outcomeNote: { fontFamily: af.semibold, fontSize: 12, lineHeight: 17, color: ac.tertiary, marginTop: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { flex: 1, fontFamily: af.heading, fontSize: 20, color: ac.text, letterSpacing: -0.4 },
  cardTitle: { flex: 1, fontFamily: af.heading, fontSize: 18, color: ac.text, letterSpacing: -0.3 },
  docCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  docTitle: { fontFamily: af.semibold, fontSize: 15, color: ac.text },
  docSub: { fontFamily: af.body, fontSize: 13, lineHeight: 18, color: ac.textMuted, marginTop: 2 },
  priceTag: { backgroundColor: ac.containerHigh, borderRadius: ar.md, paddingHorizontal: 12, paddingVertical: 10 },
  priceText: { fontFamily: af.bold, fontSize: 15, color: ac.primary },
  foot: { fontFamily: af.body, fontSize: 12, lineHeight: 17, color: ac.textMuted },
  checklistHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checklistTitle: { flex: 1, fontFamily: af.headingSemi, fontSize: 21, lineHeight: 26, color: ac.text, letterSpacing: -0.4 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ac.successBright, borderRadius: ar.full, paddingHorizontal: 14, paddingVertical: 6 },
  verifiedPillOff: { backgroundColor: ac.containerHigh },
  verifiedPillText: { fontFamily: af.bold, fontSize: 12, lineHeight: 15, color: ac.onSuccessBright },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: ac.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: ac.success },
  boxDisabled: { borderColor: ac.outlineVariant },
  checkTitle: { fontFamily: af.semibold, fontSize: 15, color: ac.text },
  checkHint: { fontFamily: af.body, fontSize: 13, lineHeight: 18, color: ac.textMuted, marginTop: 2 },
  problem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  problemText: { flex: 1, fontFamily: af.body, fontSize: 13, lineHeight: 18, color: ac.text },
  reject: { flex: 2 },
  approve: { flex: 3 },
});
