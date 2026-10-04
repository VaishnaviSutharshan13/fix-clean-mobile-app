import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chip from '../../components/Chip';
import FormMessage from '../../components/FormMessage';
import Header from '../../components/Header';
import Input from '../../components/Input';
import Loading from '../../components/Loading';
import Rating from '../../components/Rating';
import Screen from '../../components/Screen';
import StateView from '../../components/StateView';
import VerifiedBadge from '../../components/VerifiedBadge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { bookingService } from '../../services/bookingService';
import { providerService } from '../../services/providerService';
import { TIME_SLOTS, type TimeSlot } from '../../types/booking';
import { addDays, formatBookingDate, formatTimeSlot, sriLankaToday } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';

const DAYS_SHOWN = 14;
const MAX_PROBLEM_LENGTH = 500;

type FieldErrors = Partial<Record<'service' | 'date' | 'slot' | 'street' | 'city' | 'problem', string>>;

function dayChipLabel(isoDate: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return formatBookingDate(isoDate, false);
}

// Book Service (Milestone 02, Variant A): a single sequential form — service,
// date, time window, address, problem description and price summary (NFR1).
// With ?bookingId=… it edits an existing booking that is still "requested".
export default function BookService() {
  const params = useLocalSearchParams<{ providerId?: string; serviceId?: string; bookingId?: string }>();
  const editingId = params.bookingId;

  const { data, error, loading, reload } = useAsync(async () => {
    const booking = editingId ? await bookingService.getMine(editingId) : undefined;
    const providerId = booking?.provider.id ?? params.providerId;
    if (!providerId) throw new Error('missing provider');
    const provider = await providerService.details(providerId);
    return { booking, provider };
  }, [editingId, params.providerId]);

  const today = useMemo(() => sriLankaToday(), []);
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today.date, i)), [today.date]);

  const [serviceId, setServiceId] = useState<string>();
  const [date, setDate] = useState<string>();
  const [slot, setSlot] = useState<TimeSlot>();
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [landmark, setLandmark] = useState('');
  const [problem, setProblem] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // Prefill from the selected service, or from the booking being modified.
  useEffect(() => {
    if (!data) return;
    const { booking, provider } = data;
    if (booking) {
      setServiceId(booking.service.id);
      setDate(booking.scheduledDate);
      setSlot(booking.timeSlot);
      setStreet(booking.address.street);
      setCity(booking.address.city);
      setLandmark(booking.address.landmark);
      setProblem(booking.problemDescription);
    } else {
      const preselected = provider.services.find((s) => s.id === params.serviceId);
      setServiceId(preselected?.id ?? provider.services[0]?.id);
    }
  }, [data, params.serviceId]);

  if (loading && !data) return <Loading message="Preparing booking form…" />;
  if (error || !data) {
    return (
      <Screen header={<Header title="Schedule Booking" />}>
        <StateView
          title="Couldn't open the booking form"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </Screen>
    );
  }

  const { provider, booking } = data;

  if (booking && !booking.canModify) {
    return (
      <Screen header={<Header title="Modify Booking" />}>
        <StateView
          icon="lock-closed-outline"
          title="This booking can no longer be changed"
          message="The provider has already responded to this booking."
          actionLabel="Back to tracking"
          onAction={() => router.replace({ pathname: '/customer/track-booking', params: { id: booking.id } })}
        />
      </Screen>
    );
  }

  const service = provider.services.find((s) => s.id === serviceId);
  const total = (service?.price ?? 0) + provider.visitFee;

  const isSlotPast = (s: TimeSlot) => date === today.date && Number(s.slice(0, 2)) <= today.hour;

  const validate = (): FieldErrors => ({
    service: service ? undefined : 'Please choose a service',
    date: date ? undefined : 'Please choose a date',
    slot: !slot ? 'Please choose a time window' : isSlotPast(slot) ? 'That time window has already started' : undefined,
    street: street.trim() ? undefined : 'Street address is required',
    city: city.trim() ? undefined : 'City is required',
    problem: problem.trim() ? undefined : 'Please describe the problem',
  });

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) {
      setFormError('Please complete the highlighted fields.');
      return;
    }

    const payload = {
      serviceId: serviceId!,
      scheduledDate: date!,
      timeSlot: slot!,
      address: { street: street.trim(), city: city.trim(), ...(landmark.trim() ? { landmark: landmark.trim() } : {}) },
      problemDescription: problem.trim(),
    };

    setSubmitting(true);
    try {
      const saved = booking
        ? await bookingService.update(booking.id, payload)
        : await bookingService.create({ ...payload, providerId: provider.id });
      router.replace({
        pathname: '/customer/booking-confirmation',
        params: { id: saved.id, ...(booking ? { updated: '1' } : {}) },
      });
    } catch (err) {
      setFormError(
        getFriendlyErrorMessage(err, {
          404: 'This provider is not available for booking right now.',
          409: 'This booking can no longer be changed because the provider has already responded.',
        }),
      );
      setSubmitting(false);
    }
  };

  const clear = (field: keyof FieldErrors) => errors[field] && setErrors((e) => ({ ...e, [field]: undefined }));

  return (
    <Screen
      header={<Header title={booking ? 'Modify Booking' : 'Schedule Booking'} />}
      footer={
        <>
          <Button
            title={booking ? 'SAVE CHANGES' : 'CONFIRM BOOKING'}
            icon="arrow-forward"
            onPress={handleSubmit}
            loading={submitting}
          />
          <Text style={styles.footerNote}>Pay cash after the job is done. You can cancel before the provider is on the way.</Text>
        </>
      }
    >
      {/* Provider summary */}
      <Card>
        <View style={styles.providerRow}>
          <Avatar name={provider.name} size={52} />
          <View style={styles.providerText}>
            <View style={styles.inline}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <VerifiedBadge status={provider.verificationStatus} />
            </View>
            <Text style={styles.muted}>
              {provider.headline} · {provider.serviceArea}
            </Text>
            <Rating value={provider.ratingAverage} count={provider.reviewCount} size={13} />
          </View>
        </View>
      </Card>

      {formError ? <FormMessage message={formError} /> : null}

      {/* 1. Service */}
      <Card title="1. Service">
        {provider.services.map((s) => {
          const selected = s.id === serviceId;
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                setServiceId(s.id);
                clear('service');
              }}
              style={[styles.option, selected && styles.optionSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? colors.primary : colors.textSubtle}
              />
              <Text style={styles.optionText}>{s.name}</Text>
              <Text style={styles.optionPrice}>{formatLKR(s.price)}</Text>
            </Pressable>
          );
        })}
        {errors.service ? <Text style={styles.error}>{errors.service}</Text> : null}
      </Card>

      {/* 2. Schedule */}
      <Card title="2. Date & time" right={<Text style={styles.hint}>Sri Lanka time</Text>}>
        <Text style={styles.label}>DATE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {days.map((d, index) => (
            <Chip
              key={d}
              label={dayChipLabel(d, index)}
              selected={date === d}
              onPress={() => {
                setDate(d);
                clear('date');
                if (slot && d === today.date && Number(slot.slice(0, 2)) <= today.hour) setSlot(undefined);
              }}
            />
          ))}
        </ScrollView>
        {errors.date ? <Text style={styles.error}>{errors.date}</Text> : null}

        <Text style={styles.label}>ARRIVAL WINDOW</Text>
        <View style={styles.slotGrid}>
          {TIME_SLOTS.map((s) => (
            <Chip
              key={s}
              label={formatTimeSlot(s)}
              selected={slot === s}
              disabled={isSlotPast(s)}
              onPress={() => {
                setSlot(s);
                clear('slot');
              }}
            />
          ))}
        </View>
        {errors.slot ? <Text style={styles.error}>{errors.slot}</Text> : null}
      </Card>

      {/* 3. Address */}
      <Card title="3. Service address">
        <Input
          label="Street address"
          icon="home-outline"
          placeholder="e.g. No. 25, Kandy Road"
          value={street}
          onChangeText={(t) => {
            setStreet(t);
            clear('street');
          }}
          error={errors.street}
          autoComplete="street-address"
          maxLength={150}
        />
        <Input
          label="City / town"
          icon="location-outline"
          placeholder={`e.g. ${provider.serviceArea}`}
          value={city}
          onChangeText={(t) => {
            setCity(t);
            clear('city');
          }}
          error={errors.city}
          maxLength={60}
        />
        <Input
          label="Landmark (optional)"
          icon="flag-outline"
          placeholder="e.g. Near the temple"
          value={landmark}
          onChangeText={setLandmark}
          maxLength={100}
        />
        <View style={styles.privacy}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
          <Text style={styles.privacyText}>
            Your address and phone number are shared with the provider only after they confirm the booking.
          </Text>
        </View>
      </Card>

      {/* 4. Problem */}
      <Card title="4. Problem description">
        <Input
          label="What needs fixing or cleaning?"
          placeholder="e.g. Kitchen tap leaking steadily under the sink. Needs washer or valve check."
          value={problem}
          onChangeText={(t) => {
            setProblem(t);
            clear('problem');
          }}
          error={errors.problem}
          multiline
          maxLength={MAX_PROBLEM_LENGTH}
        />
        <Text style={styles.counter}>
          {problem.length}/{MAX_PROBLEM_LENGTH}
        </Text>
      </Card>

      {/* Price summary */}
      <Card title="Estimated price breakdown">
        <View style={styles.priceRow}>
          <Text style={styles.muted}>{service?.name ?? 'Service'}</Text>
          <Text style={styles.priceValue}>{formatLKR(service?.price ?? 0)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.muted}>Visiting fee</Text>
          <Text style={styles.priceValue}>{provider.visitFee > 0 ? formatLKR(provider.visitFee) : 'Free'}</Text>
        </View>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total estimated</Text>
            <Text style={styles.hint}>Final quote may change after inspection</Text>
          </View>
          <Text style={styles.totalValue}>{formatLKR(total)}</Text>
        </View>
        <View style={styles.payment}>
          <Ionicons name="cash-outline" size={20} color={colors.success} />
          <View>
            <Text style={styles.hint}>PAYMENT METHOD</Text>
            <Text style={styles.paymentText}>Cash on service</Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  providerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  providerText: { flex: 1, gap: 3 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  providerName: { fontSize: 16, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  optionPrice: { fontSize: 14, fontWeight: '800', color: colors.primary },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4 },
  hint: { fontSize: 11, color: colors.textMuted },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  privacy: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.primaryDark },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: colors.textMuted, marginTop: -spacing.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  payment: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  paymentText: { fontSize: 14, fontWeight: '700', color: colors.text },
  error: { fontSize: 12, color: colors.danger },
  footerNote: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
