import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AdminShell from '../../components/admin/AdminShell';
import InfoRow from '../../components/admin/InfoRow';
import { ACard, BackLink, Tag, Well } from '../../components/admin/Primitives';
import StatusPill from '../../components/admin/StatusPill';
import Timeline from '../../components/admin/Timeline';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import { ac, af, ar } from '../../constants/adminTheme';
import { useAsync } from '../../hooks/useAsync';
import { useFocusPolling } from '../../hooks/useFocusPolling';
import { adminService } from '../../services/adminService';
import { ADMIN_BOOKING_META, BOOKING_ACCENT, COMPLAINT_STATUS_META } from '../../utils/admin';
import { CATEGORY_META } from '../../utils/display';
import { formatBookingDate, formatDateTime, formatTimeSlot } from '../../utils/dates';
import { formatLKR, getFriendlyErrorMessage, getInitials } from '../../utils/helpers';

// Booking details for monitoring (no dedicated Figma frame; styled like the
// Booking Monitor card in 1:2430). Read-only. Only the city is shown; the
// exact address and phone numbers aren't needed for monitoring.
export default function BookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, error, loading, refreshing, reload } = useAsync(() => adminService.booking(id), [id]);
  useFocusPolling(() => void reload(true), 15_000);

  if (loading && !booking) return <Loading message="Loading booking…" />;
  if (!booking) {
    return (
      <AdminShell title="Booking Details">
        <StateView title="Couldn't load this booking" message={getFriendlyErrorMessage(error)} actionLabel="Try again" onAction={() => reload()} />
      </AdminShell>
    );
  }

  const cat = CATEGORY_META[booking.service.category];

  return (
    <AdminShell title="Booking Details" refreshing={refreshing} onRefresh={() => reload(true)}>
      <BackLink
        label="Back to Booking Monitor"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/booking-monitoring'))}
        right={<Tag label="READ-ONLY" icon="eye-outline" fg={ac.textMuted} />}
      />
      {error ? <FormMessage message={getFriendlyErrorMessage(error)} /> : null}

      <ACard accent={BOOKING_ACCENT[booking.status]}>
        <View style={styles.head}>
          <Ionicons name={cat.icon} size={20} color={cat.tint} />
          <Text style={styles.ref}>#{booking.reference}</Text>
          <StatusPill meta={ADMIN_BOOKING_META[booking.status]} />
        </View>
        <Well style={styles.serviceWell}>
          <Text style={styles.service}>
            {booking.service.name}
            <Text style={styles.serviceCat}> • {cat.label}</Text>
          </Text>
        </Well>
        <View style={styles.people}>
          {[
            ['CUSTOMER', booking.customer.name],
            ['PROVIDER', booking.provider.name],
          ].map(([role, name]) => (
            <View key={role} style={styles.person}>
              <View style={styles.personAvatar}>
                <Text style={styles.personInitials}>{getInitials(name!)}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.personRole}>{role}</Text>
                <Text style={styles.personName}>{name}</Text>
              </View>
            </View>
          ))}
        </View>
        <Well>
          <InfoRow icon="calendar-outline" value={formatBookingDate(booking.scheduledDate)} />
          <InfoRow icon="time-outline" value={formatTimeSlot(booking.timeSlot)} />
          <InfoRow icon="location-outline" value={booking.city} />
          <InfoRow icon="add-circle-outline" value={`Created ${formatDateTime(booking.createdAt)}`} />
          {booking.cancellationReason ? (
            <InfoRow icon="chatbubble-ellipses-outline" value={`${booking.status === 'declined' ? 'Decline' : 'Cancel'} reason: ${booking.cancellationReason}`} />
          ) : null}
        </Well>
      </ACard>

      <ACard>
        <Text style={styles.cardTitle}>Problem description</Text>
        <Text style={styles.body}>{booking.problemDescription}</Text>
      </ACard>

      <ACard>
        <Text style={styles.cardTitle}>Price (cash on service)</Text>
        <Well>
          <InfoRow label="Service" value={formatLKR(booking.pricing.servicePrice)} />
          <InfoRow label="Visiting fee" value={formatLKR(booking.pricing.visitFee)} />
        </Well>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Agreed total</Text>
          <Text style={styles.totalValue}>{formatLKR(booking.pricing.total)}</Text>
        </View>
      </ACard>

      <ACard>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>Status history</Text>
          <StatusPill meta={ADMIN_BOOKING_META[booking.status]} />
        </View>
        <Timeline entries={booking.statusHistory} meta={ADMIN_BOOKING_META} />
        <Text style={styles.foot}>
          Status changes are made by the customer (cancel) and the provider (accept, decline, on the way, complete). Admins
          monitor only.
        </Text>
      </ACard>

      {booking.complaints.length > 0 ? (
        <ACard>
          <Text style={styles.cardTitle}>Complaints about this booking</Text>
          {booking.complaints.map((c) => (
            <Pressable
              key={c.id}
              style={styles.complaint}
              onPress={() => router.push({ pathname: '/admin/complaint-details', params: { id: c.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Complaint ${c.reference}`}
            >
              <Text style={styles.complaintRef}>#{c.reference}</Text>
              <StatusPill meta={COMPLAINT_STATUS_META[c.status]} />
              <Ionicons name="chevron-forward" size={16} color={ac.textMuted} />
            </Pressable>
          ))}
        </ACard>
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontFamily: af.heading, fontSize: 18, color: ac.text, letterSpacing: -0.3 },
  body: { fontFamily: af.body, fontSize: 14, lineHeight: 21, color: ac.text },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  totalLabel: { fontFamily: af.semibold, fontSize: 14, color: ac.textMuted },
  totalValue: { fontFamily: af.heading, fontSize: 22, color: ac.primary },
  foot: { fontFamily: af.body, fontSize: 12, lineHeight: 17, color: ac.textMuted },
  complaint: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ac.containerLow, borderRadius: ar.md, padding: 12 },
  complaintRef: { flex: 1, fontFamily: af.bold, fontSize: 14, color: ac.text },
});
