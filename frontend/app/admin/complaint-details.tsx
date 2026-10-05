import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import AdminShell from '../../components/admin/AdminShell';
import InfoRow from '../../components/admin/InfoRow';
import { ACard, AButton, BackLink, Tag, Well } from '../../components/admin/Primitives';
import StatusPill from '../../components/admin/StatusPill';
import Timeline from '../../components/admin/Timeline';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import { ac, af, ar } from '../../constants/adminTheme';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services/adminService';
import type { AdminComplaintDetails, ComplaintStatus } from '../../types/admin';
import {
  ADMIN_BOOKING_META,
  COMPLAINT_ACCENT,
  COMPLAINT_ACTION_LABEL,
  COMPLAINT_CATEGORY_LABEL,
  COMPLAINT_STATUS_META,
  MAX_NOTE,
  validateComplaintNote,
} from '../../utils/admin';
import { confirmAction } from '../../utils/display';
import { formatDateTime } from '../../utils/dates';
import { getFriendlyErrorMessage } from '../../utils/helpers';

// Complaint details and management (no dedicated Figma frame; Booking Monitor
// card language from 1:2430). Shows the full description, parties, booking,
// history and the actions the server allows from the current status
// (open → in review → resolved). Resolving requires a resolution note.
export default function ComplaintDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload } = useAsync(() => adminService.complaint(id), [id]);
  const [local, setLocal] = useState<AdminComplaintDetails>();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string>();
  const [saving, setSaving] = useState<ComplaintStatus>();
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>();

  useEffect(() => setLocal(data), [data]);
  const complaint = local ?? data;

  if (loading && !data) return <Loading message="Loading complaint…" />;
  if (!complaint) {
    return (
      <AdminShell title="Complaint">
        <StateView title="Couldn't load this complaint" message={getFriendlyErrorMessage(error)} actionLabel="Try again" onAction={() => reload()} />
      </AdminShell>
    );
  }

  const changeStatus = async (to: ComplaintStatus) => {
    const problem = validateComplaintNote(to, note);
    setNoteError(problem);
    setMessage(undefined);
    if (problem) return;
    if (to === 'resolved') {
      const ok = await confirmAction('Resolve complaint?', 'The complaint will be closed with your resolution note.', 'Resolve');
      if (!ok) return;
    }
    setSaving(to);
    try {
      const updated = await adminService.setComplaintStatus(complaint.id, to, note.trim() || undefined);
      setLocal(updated);
      setNote('');
      setMessage({ tone: 'success', text: `Complaint marked ${COMPLAINT_STATUS_META[updated.status].label.toLowerCase()}.` });
    } catch (err) {
      setMessage({ tone: 'error', text: getFriendlyErrorMessage(err) });
      void reload(true);
    } finally {
      setSaving(undefined);
    }
  };

  const actions = complaint.allowedTransitions;

  return (
    <AdminShell title="Complaint Details" refreshing={refreshing} onRefresh={() => reload(true)}>
      <BackLink
        label="Back to Complaints"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/complaints'))}
        right={<Tag label={`#${complaint.reference}`} fg={ac.textMuted} />}
      />
      {message ? <FormMessage tone={message.tone} message={message.text} /> : null}

      <ACard accent={COMPLAINT_ACCENT[complaint.status]}>
        <View style={styles.head}>
          <Text style={styles.category}>{COMPLAINT_CATEGORY_LABEL[complaint.category].toUpperCase()}</Text>
          <StatusPill meta={COMPLAINT_STATUS_META[complaint.status]} />
        </View>
        <Text style={styles.subject}>{complaint.subject}</Text>
        <Text style={styles.body} selectable>
          {complaint.description}
        </Text>
        <Well>
          <InfoRow icon="person-outline" label="Customer" value={complaint.customer.name} />
          <InfoRow icon="construct-outline" label="Provider" value={complaint.provider.name} />
          <InfoRow icon="calendar-outline" label="Submitted" value={formatDateTime(complaint.createdAt)} />
          {complaint.resolvedAt ? <InfoRow icon="checkmark-done-outline" label="Resolved" value={formatDateTime(complaint.resolvedAt)} /> : null}
        </Well>
      </ACard>

      {complaint.booking ? (
        <Pressable
          style={styles.booking}
          onPress={() => router.push({ pathname: '/admin/booking-details', params: { id: complaint.booking!.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Open booking ${complaint.booking.reference}`}
        >
          <View style={styles.bookingIcon}>
            <Ionicons name="receipt-outline" size={20} color={ac.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.bookingRef}>Booking #{complaint.booking.reference}</Text>
            <Text style={styles.bookingSub} numberOfLines={2}>
              {complaint.booking.serviceName}
            </Text>
          </View>
          <StatusPill meta={ADMIN_BOOKING_META[complaint.booking.status]} />
        </Pressable>
      ) : null}

      {complaint.resolutionNote ? (
        <View style={styles.resolution}>
          <Text style={styles.resolutionTitle}>Resolution</Text>
          <Text style={styles.body}>{complaint.resolutionNote}</Text>
        </View>
      ) : null}

      {actions.length > 0 ? (
        <ACard>
          <Text style={styles.cardTitle}>Update status</Text>
          <TextInput
            value={note}
            onChangeText={(t) => {
              setNote(t);
              if (noteError) setNoteError(undefined);
            }}
            placeholder={actions.includes('resolved') ? 'Note (required to resolve), e.g. what was agreed with the customer' : 'Note (optional)'}
            placeholderTextColor={ac.outline}
            style={[styles.textArea, !!noteError && styles.textAreaError]}
            multiline
            maxLength={MAX_NOTE}
            editable={!saving}
            accessibilityLabel="Status note"
          />
          <Text style={[styles.counter, !!noteError && { color: ac.error }]}>{noteError ?? `${note.trim().length}/${MAX_NOTE}`}</Text>
          <View style={styles.actions}>
            {actions.map((to) => (
              <AButton
                key={to}
                label={COMPLAINT_ACTION_LABEL[to]}
                tone={to === 'resolved' ? 'success' : 'light'}
                icon={to === 'resolved' ? 'checkmark-circle-outline' : 'search-outline'}
                onPress={() => changeStatus(to)}
                loading={saving === to}
                disabled={!!saving && saving !== to}
                style={styles.action}
              />
            ))}
          </View>
        </ACard>
      ) : (
        <FormMessage tone="info" message="This complaint is resolved. Resolved complaints can't be changed." />
      )}

      <ACard>
        <Text style={styles.cardTitle}>History</Text>
        <Timeline entries={complaint.statusHistory} meta={COMPLAINT_STATUS_META} />
      </ACard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  category: { flex: 1, fontFamily: af.bold, fontSize: 12, color: ac.error, letterSpacing: 0.5 },
  subject: { fontFamily: af.heading, fontSize: 19, lineHeight: 25, color: ac.text, letterSpacing: -0.3 },
  body: { fontFamily: af.body, fontSize: 14, lineHeight: 21, color: ac.text },
  cardTitle: { fontFamily: af.heading, fontSize: 18, color: ac.text, letterSpacing: -0.3 },
  booking: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ac.card, borderRadius: ar.lg, padding: 14 },
  bookingIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: ac.containerHigh, alignItems: 'center', justifyContent: 'center' },
  bookingRef: { fontFamily: af.semibold, fontSize: 15, color: ac.text },
  bookingSub: { fontFamily: af.body, fontSize: 12, color: ac.textMuted },
  resolution: { backgroundColor: ac.successSoft, borderRadius: ar.lg, padding: 16, gap: 6 },
  resolutionTitle: { fontFamily: af.heading, fontSize: 16, color: ac.success },
  textArea: { outlineWidth: 0, outlineStyle: 'solid',
    minHeight: 88,
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
  counter: { fontFamily: af.body, fontSize: 12, color: ac.textMuted, textAlign: 'right', marginTop: -6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, flexBasis: 140 },
});
