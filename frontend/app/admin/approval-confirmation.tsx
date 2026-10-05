import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import AdminShell from '../../components/admin/AdminShell';
import InfoRow from '../../components/admin/InfoRow';
import { ACard, AButton, BackLink, Tag, Well } from '../../components/admin/Primitives';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import { ac, af, ar } from '../../constants/adminTheme';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services/adminService';
import type { AdminProviderDetails } from '../../types/admin';
import {
  CHECK_ITEMS,
  confirmedCheckCount,
  formatExperience,
  MAX_REJECTION_REASON,
  shortRef,
  validateRejectionReason,
  verificationOutcome,
} from '../../utils/admin';
import { CATEGORY_META } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage, getInitials } from '../../utils/helpers';

type Action = 'approve' | 'reject';

const CONSEQUENCES: Record<Action, string[]> = {
  approve: [
    'The provider is marked Verified and sees this in their portal.',
    'They appear in customer search, categories and Provider Details.',
    'Customers can book their approved services, within their availability.',
  ],
  reject: [
    'The provider sees “Verification not approved” (and your reason) in their portal.',
    'They stay hidden from customers and cannot be booked.',
    'This decision is final in the app.',
  ],
};

// Approval / Rejection Confirmation (FR7). The Admin Figma has no separate
// frame for this step (Approve returns to the queue), so it follows the
// Verification Detail Review frame 1:2050. The server re-checks that the
// application is still pending and, for approval, that it is bookable.
export default function ApprovalConfirmation() {
  const params = useLocalSearchParams<{ id: string; action?: string }>();
  const action: Action = params.action === 'reject' ? 'reject' : 'approve';
  const { data, error, loading, reload } = useAsync(() => adminService.provider(params.id), [params.id]);

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [result, setResult] = useState<AdminProviderDetails>();

  if (loading && !data) return <Loading message="Loading application…" />;
  if (!data) {
    return (
      <AdminShell title="Confirm Decision">
        <StateView title="Couldn't load this application" message={getFriendlyErrorMessage(error)} actionLabel="Try again" onAction={() => reload()} />
      </AdminShell>
    );
  }

  const backToRequests = () => router.dismissTo('/admin/verification-requests');

  if (result) {
    const approved = result.verificationStatus === 'verified';
    const outcome = verificationOutcome(approved ? 'approve' : 'reject', result.name);
    return (
      <AdminShell
        title={approved ? 'Provider Approved' : 'Application Rejected'}
        footer={
          <View style={styles.stack}>
            <AButton label="Back to Verification Requests" caps onPress={backToRequests} />
            <AButton label="Go to Dashboard" tone="light" onPress={() => router.dismissTo('/admin/dashboard')} />
          </View>
        }
      >
        <ACard style={styles.result}>
          <View style={[styles.resultIcon, { backgroundColor: approved ? ac.successBright : ac.errorContainer }]}>
            <Ionicons name={approved ? 'shield-checkmark' : 'close-circle'} size={40} color={approved ? ac.success : ac.error} />
          </View>
          <Text style={styles.resultTitle} accessibilityLiveRegion="polite">
            {outcome.title}
          </Text>
          <Text style={styles.resultBody}>{outcome.message}</Text>
          {!approved && result.rejectionReason ? <Text style={styles.resultReason}>Reason: “{result.rejectionReason}”</Text> : null}
        </ACard>
      </AdminShell>
    );
  }

  const alreadyReviewed = data.verificationStatus !== 'pending';
  const reasonError = validateRejectionReason(reason);
  const blocked = action === 'approve' && !data.approval.ready;
  const prices = data.services.map((s) => s.price);
  const checks = confirmedCheckCount(data.verificationChecks);

  const confirm = async () => {
    if (reasonError) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      setResult(
        action === 'approve'
          ? await adminService.approveProvider(data.id)
          : await adminService.rejectProvider(data.id, reason.trim() || undefined),
      );
    } catch (err) {
      setSubmitError(getFriendlyErrorMessage(err));
      void reload(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminShell
      title={action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
      footer={
        alreadyReviewed ? (
          <AButton label="Back to Verification Requests" caps onPress={backToRequests} style={styles.flex} />
        ) : (
          <>
            <AButton label="Cancel" tone="light" onPress={() => router.back()} disabled={submitting} style={styles.cancel} />
            {action === 'approve' ? (
              <AButton
                label="Approve Pro"
                tone="success"
                caps
                icon="checkmark-circle-outline"
                onPress={confirm}
                loading={submitting}
                disabled={blocked}
                style={styles.confirm}
                accessibilityLabel="Approve"
              />
            ) : (
              <AButton
                label="Reject"
                tone="danger"
                caps
                icon="close"
                onPress={confirm}
                loading={submitting}
                disabled={!!reasonError}
                style={styles.confirm}
              />
            )}
          </>
        )
      }
    >
      <BackLink label="Back to Review" onPress={() => router.back()} right={<Tag label={shortRef('APP', data.id)} fg={ac.textMuted} />} />

      <View style={[styles.banner, { backgroundColor: action === 'approve' ? ac.successSoft : ac.errorContainer }]}>
        <Ionicons
          name={action === 'approve' ? 'shield-checkmark-outline' : 'alert-circle-outline'}
          size={24}
          color={action === 'approve' ? ac.success : ac.error}
        />
        <Text style={styles.bannerText}>
          {action === 'approve' ? `Approve ${data.name} as a verified provider?` : `Reject the provider application from ${data.name}?`}
        </Text>
      </View>

      {alreadyReviewed ? (
        <FormMessage tone="info" message={`This application has already been ${data.verificationStatus}. No further action is needed.`} />
      ) : null}

      <ACard>
        <View style={styles.identity}>
          <View style={styles.photo}>
            <Text style={styles.photoText}>{getInitials(data.name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{data.name}</Text>
            <Text style={styles.sub}>
              {CATEGORY_META[data.category].label} • {data.serviceArea} • {formatExperience(data.experienceYears)}
            </Text>
          </View>
        </View>
        <Well>
          <InfoRow
            label="Services"
            value={data.services.length === 0 ? 'None proposed' : `${data.services.length} • ${formatLKR(Math.min(...prices))} – ${formatLKR(Math.max(...prices))}`}
          />
          <InfoRow label="Visiting fee" value={formatLKR(data.visitFee)} />
          <InfoRow label="Checks" value={`${checks}/${CHECK_ITEMS.length} confirmed (identity, contact, experience)`} />
        </Well>
      </ACard>

      {!alreadyReviewed ? (
        <ACard>
          <Text style={styles.cardTitle}>What happens next</Text>
          {CONSEQUENCES[action].map((line) => (
            <View key={line} style={styles.bullet}>
              <View style={[styles.bulletBox, { backgroundColor: action === 'approve' ? ac.success : ac.error }]}>
                <Ionicons name={action === 'approve' ? 'checkmark' : 'remove'} size={14} color={ac.onPrimary} />
              </View>
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))}
        </ACard>
      ) : null}

      {!alreadyReviewed && blocked ? (
        <ACard>
          <Text style={styles.cardTitle}>This provider can&apos;t be approved yet</Text>
          {data.approval.problems.map((p) => (
            <View key={p} style={styles.bullet}>
              <Ionicons name="alert-circle-outline" size={17} color={ac.tertiary} />
              <Text style={styles.bulletText}>{p}</Text>
            </View>
          ))}
        </ACard>
      ) : null}

      {!alreadyReviewed && action === 'reject' ? (
        <ACard>
          <Text style={styles.cardTitle}>Reason (optional)</Text>
          <Text style={styles.hint}>Shown to the provider in their portal.</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. We could not confirm your experience. Please contact support."
            placeholderTextColor={ac.outline}
            style={[styles.textArea, !!reasonError && styles.textAreaError]}
            multiline
            maxLength={MAX_REJECTION_REASON + 20}
            editable={!submitting}
            accessibilityLabel="Rejection reason"
          />
          <Text style={[styles.counter, !!reasonError && { color: ac.error }]}>
            {reasonError ?? `${reason.trim().length}/${MAX_REJECTION_REASON}`}
          </Text>
        </ACard>
      ) : null}

      {submitError ? <FormMessage message={submitError} /> : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  stack: { flex: 1, gap: 8 },
  cancel: { flex: 2 },
  confirm: { flex: 3 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: ar.lg },
  bannerText: { flex: 1, fontFamily: af.heading, fontSize: 17, lineHeight: 23, color: ac.text, letterSpacing: -0.3 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { width: 56, height: 56, borderRadius: ar.md, backgroundColor: ac.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  photoText: { fontFamily: af.heading, fontSize: 20, color: ac.primary },
  name: { fontFamily: af.heading, fontSize: 18, lineHeight: 23, color: ac.text, letterSpacing: -0.4 },
  sub: { fontFamily: af.body, fontSize: 13, color: ac.textMuted, marginTop: 2 },
  cardTitle: { fontFamily: af.heading, fontSize: 18, color: ac.text, letterSpacing: -0.3 },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletBox: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  bulletText: { flex: 1, fontFamily: af.body, fontSize: 14, lineHeight: 20, color: ac.text },
  hint: { fontFamily: af.body, fontSize: 12, color: ac.textMuted, marginTop: -6 },
  textArea: { outlineWidth: 0, outlineStyle: 'solid',
    minHeight: 96,
    textAlignVertical: 'top',
    backgroundColor: ac.containerLow,
    borderRadius: ar.md,
    borderWidth: 1,
    borderColor: ac.containerLow,
    padding: 12,
    fontFamily: af.body,
    fontSize: 15,
    color: ac.text,
  },
  textAreaError: { borderColor: ac.error },
  counter: { fontFamily: af.body, fontSize: 12, color: ac.textMuted, textAlign: 'right' },
  result: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  resultIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontFamily: af.heading, fontSize: 24, color: ac.text, textAlign: 'center', letterSpacing: -0.5 },
  resultBody: { fontFamily: af.body, fontSize: 15, lineHeight: 22, color: ac.textMuted, textAlign: 'center' },
  resultReason: { fontFamily: af.body, fontSize: 14, color: ac.text, fontStyle: 'italic', textAlign: 'center' },
});
