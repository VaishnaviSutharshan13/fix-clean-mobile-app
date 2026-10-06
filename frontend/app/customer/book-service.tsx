import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import CustomerAvatar from '../../components/customer/CustomerAvatar';
import CustomerButton from '../../components/customer/CustomerButton';
import { CustomerHeader } from '../../components/customer/CustomerHeader';
import { CCard, Pill } from '../../components/customer/CustomerPrimitives';
import CustomerScreen from '../../components/customer/CustomerScreen';
import { CATEGORY_TONE, cc, cf, cr } from '../../constants/customerTheme';
import { useAsync } from '../../hooks/useAsync';
import { bookingService } from '../../services/bookingService';
import { providerService } from '../../services/providerService';
import { TIME_SLOTS, type TimeSlot } from '../../types/booking';
import { addDays, formatBookingDate, formatTimeSlot, sriLankaToday } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage } from '../../utils/helpers';
import { photoUri } from '../../services/userService';

const DAYS_SHOWN = 14;
const MAX_PROBLEM_LENGTH = 500;

type FieldErrors = Partial<Record<'service' | 'date' | 'slot' | 'street' | 'city' | 'problem', string>>;

// Book Service matching Figma (conform_booking.jpeg):
// Header < Schedule Booking (or Modify Booking), ⋮, avatar,
// SubNav < Back, DIRECT BOOKING, Cancel (red),
// Provider summary with PRO badge, EST. FEE Rs. 2,500, guarantee note,
// Schedule & Location: DATE & TIME WINDOW side-by-side, SERVICE ADDRESS with Change link,
// PROBLEM DESCRIPTION with chips (Tap Valve, Under Sink, camera icon),
// Estimated Price Breakdown with ⓘ No hidden fees,
// Payment Method (Cash on Service • [change]),
// Security note, CONFIRM BOOKING →, cancellation policy footer.
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

  // The form starts empty for a new booking (no sample address or problem).
  const [serviceId, setServiceId] = useState<string>();
  const [date, setDate] = useState<string>();
  const [slot, setSlot] = useState<TimeSlot>();
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [landmark, setLandmark] = useState('');
  const [problem, setProblem] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(true);
  const [showSlotPicker, setShowSlotPicker] = useState(true);
  const [editingAddress, setEditingAddress] = useState(true);
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
      setShowDatePicker(false);
      setShowSlotPicker(false);
      setEditingAddress(false);
    } else {
      const preselected = provider.services.find((s) => s.id === params.serviceId);
      setServiceId(preselected?.id ?? provider.services[0]?.id);
    }
  }, [data, params.serviceId]);

  if (loading && !data) return <Loading message="Preparing booking form…" />;
  if (error || !data) {
    return (
      <CustomerScreen header={<CustomerHeader title="Schedule Booking" />}>
        <StateView
          title="Couldn't open booking form"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </CustomerScreen>
    );
  }

  const { provider, booking } = data;

  if (booking && !booking.canModify) {
    return (
      <CustomerScreen header={<CustomerHeader title="Modify Booking" />}>
        <StateView
          icon="lock-closed-outline"
          title="This booking can no longer be changed"
          message="The provider has already responded to this booking."
          actionLabel="Back to tracking"
          onAction={() => router.replace({ pathname: '/customer/track-booking', params: { id: booking.id } })}
        />
      </CustomerScreen>
    );
  }

  const service = provider.services.find((s) => s.id === serviceId);
  const total = (service?.price ?? 0) + provider.visitFee;
  const tone = CATEGORY_TONE[provider.category];
  const verified = provider.verificationStatus === 'verified';
  const reviewed = provider.reviewCount > 0;

  // FR5: only the provider's working days and shift windows can be booked.
  const availability = provider.availability;
  const weekdayOf = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  };
  const isDayOff = (iso: string) => !availability.workingDays.includes(weekdayOf(iso));
  const isSlotPast = (s: TimeSlot) => date === today.date && Number(s.slice(0, 2)) <= today.hour;
  const isSlotOff = (s: TimeSlot) => !availability.timeSlots.includes(s);

  const validate = (): FieldErrors => ({
    service: service ? undefined : 'Please choose a service',
    date: date ? undefined : 'Please choose a date',
    slot: !slot
      ? 'Please choose a time window'
      : isSlotPast(slot)
        ? 'That time window has already started'
        : isSlotOff(slot)
          ? "The provider doesn't work in that time window"
          : undefined,
    street: street.trim() ? undefined : 'Street address is required',
    city: city.trim() ? undefined : 'City is required',
    problem: problem.trim() ? undefined : 'Please describe the problem',
  });

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) {
      if (nextErrors.street || nextErrors.city) setEditingAddress(true);
      if (nextErrors.date) setShowDatePicker(true);
      if (nextErrors.slot) setShowSlotPicker(true);
      setFormError('Please complete all highlighted fields.');
      return;
    }

    const payload = {
      serviceId: serviceId!,
      scheduledDate: date!,
      timeSlot: slot!,
      address: {
        street: street.trim(),
        city: city.trim(),
        ...(landmark.trim() ? { landmark: landmark.trim() } : {}),
      },
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
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/customer/home'));
  const FieldError = ({ field }: { field: keyof FieldErrors }) =>
    errors[field] ? <Text style={styles.fieldErrorText}>{errors[field]}</Text> : null;

  return (
    <CustomerScreen
      header={<CustomerHeader title={booking ? 'Modify Booking' : 'Schedule Booking'} />}
      contentStyle={styles.content}
    >
      {/* SubNavRow: < Back, DIRECT BOOKING, Cancel (leaves the form without saving) */}
      <View style={styles.subNavRow}>
        <Pressable onPress={goBack} style={styles.subBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={18} color={cc.primary} />
          <Text style={styles.subBackText}>Back</Text>
        </Pressable>
        <Text style={styles.subCenterText}>{booking ? 'MODIFY BOOKING' : 'DIRECT BOOKING'}</Text>
        <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Discard and go back">
          <Text style={styles.subCancelText}>Cancel</Text>
        </Pressable>
      </View>

      {formError ? <FormMessage message={formError} /> : null}

      {!availability.isAvailable ? (
        <FormMessage message="This provider is not accepting new bookings right now. Please choose another provider." />
      ) : null}

      {/* Provider summary */}
      <CCard style={styles.providerCard}>
        <View style={styles.providerRow}>
          <CustomerAvatar imageUrl={photoUri(provider.avatarUrl)} name={provider.name} size={58} shape="circle" verified={verified} tint={tone.tint} bg={tone.bg} />
          <View style={styles.providerInfo}>
            <View style={styles.nameProRow}>
              <Text style={styles.providerName} numberOfLines={1}>
                {provider.name}
              </Text>
              {verified ? <Pill label="PRO" tone="soft" style={styles.proPill} textStyle={styles.proText} /> : null}
            </View>
            <Text style={styles.providerSub} numberOfLines={1}>
              {service?.name ?? provider.headline}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={cc.star} />
              <Text style={styles.ratingNumber}>{reviewed ? provider.ratingAverage.toFixed(1) : 'New'}</Text>
              <Text style={styles.jobsMeta} numberOfLines={1}>
                ({provider.completedJobs} {provider.completedJobs === 1 ? 'job' : 'jobs'} in {provider.serviceArea})
              </Text>
            </View>
          </View>
          <View style={styles.feeWrap}>
            <Text style={styles.feeLabel}>EST. FEE</Text>
            <Text style={styles.feeAmount}>{formatLKR(total)}</Text>
          </View>
        </View>

        <View style={styles.guaranteeWell}>
          <Ionicons name="shield-checkmark-outline" size={16} color={cc.success} />
          <Text style={styles.guaranteeWellText}>Cash on service — you pay only after the job is done</Text>
        </View>
      </CCard>

      {/* Service */}
      <CCard style={styles.cardSection}>
        <View style={styles.sectionTitleWrap}>
          <Ionicons name="construct-outline" size={20} color={cc.primary} />
          <Text style={styles.sectionTitle}>Service</Text>
        </View>
        <View style={styles.slotsGrid}>
          {provider.services.map((s) => {
            const selected = s.id === serviceId;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  setServiceId(s.id);
                  clear('service');
                }}
                style={[styles.slotChip, styles.serviceChip, selected && styles.slotChipActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${s.name}, ${formatLKR(s.price)}`}
              >
                <Text style={[styles.slotChipText, styles.flex, selected && styles.slotChipTextActive]} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={[styles.slotChipText, selected && styles.slotChipTextActive]}>{formatLKR(s.price)}</Text>
              </Pressable>
            );
          })}
        </View>
        <FieldError field="service" />
      </CCard>

      {/* Schedule & Location */}
      <CCard style={styles.cardSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Ionicons name="calendar-outline" size={20} color={cc.primary} />
            <Text style={styles.sectionTitle}>Schedule &amp; Location</Text>
          </View>
          <Text style={styles.timeZoneText}>Sri Lanka Time</Text>
        </View>

        {/* DATE & TIME WINDOW side-by-side */}
        <View style={styles.twoColRow}>
          <View style={styles.col}>
            <Text style={styles.inputUpperLabel}>DATE</Text>
            <Pressable
              onPress={() => setShowDatePicker((v) => !v)}
              style={[styles.pillInputBox, !!errors.date && styles.inputErrorBorder]}
              accessibilityRole="button"
              accessibilityLabel={date ? `Date: ${formatBookingDate(date)}. Change date` : 'Choose a date'}
            >
              <Ionicons name="calendar-clear-outline" size={16} color={cc.primary} />
              <Text style={styles.pillInputText} numberOfLines={1}>
                {date ? formatBookingDate(date, false) : 'Choose date'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.col}>
            <Text style={styles.inputUpperLabel}>TIME WINDOW</Text>
            <Pressable
              onPress={() => setShowSlotPicker((v) => !v)}
              style={[styles.pillInputBox, !!errors.slot && styles.inputErrorBorder]}
              accessibilityRole="button"
              accessibilityLabel={slot ? `Time window: ${formatTimeSlot(slot)}. Change time` : 'Choose a time window'}
            >
              <Ionicons name="time-outline" size={16} color={cc.primary} />
              <Text style={styles.pillInputText} numberOfLines={1}>
                {slot ? formatTimeSlot(slot) : 'Choose time'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={cc.textMuted} />
            </Pressable>
          </View>
        </View>

        {showDatePicker ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
            {days.map((d, index) => {
              const off = isDayOff(d);
              const selected = date === d;
              return (
                <Pressable
                  key={d}
                  disabled={off}
                  onPress={() => {
                    setDate(d);
                    clear('date');
                    if (slot && d === today.date && Number(slot.slice(0, 2)) <= today.hour) setSlot(undefined);
                    setShowDatePicker(false);
                  }}
                  style={[styles.dayChip, selected && styles.dayChipActive, off && styles.chipDisabled]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: off }}
                  accessibilityLabel={`${formatBookingDate(d)}${off ? ', provider not working' : ''}`}
                >
                  <Text style={[styles.dayChipText, selected && styles.dayChipTextActive, off && styles.chipTextDisabled]}>
                    {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : formatBookingDate(d, false)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        <FieldError field="date" />

        {showSlotPicker ? (
          <View style={styles.slotsGrid}>
            {TIME_SLOTS.map((s) => {
              const off = isSlotPast(s) || isSlotOff(s);
              const selected = slot === s;
              return (
                <Pressable
                  key={s}
                  disabled={off}
                  onPress={() => {
                    setSlot(s);
                    clear('slot');
                    setShowSlotPicker(false);
                  }}
                  style={[styles.slotChip, selected && styles.slotChipActive, off && styles.chipDisabled]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: off }}
                  accessibilityLabel={formatTimeSlot(s)}
                >
                  <Text style={[styles.slotChipText, selected && styles.slotChipTextActive, off && styles.chipTextDisabled]}>
                    {formatTimeSlot(s)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <FieldError field="slot" />
        {availability.workingDays.length < 7 || availability.timeSlots.length < TIME_SLOTS.length ? (
          <Text style={styles.timeZoneText}>Days and windows the provider doesn&apos;t work are greyed out.</Text>
        ) : null}

        {/* SERVICE ADDRESS */}
        <View style={styles.fieldBlock}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.inputUpperLabel}>SERVICE ADDRESS</Text>
            {street.trim() && city.trim() ? (
              <Pressable onPress={() => setEditingAddress((v) => !v)} hitSlop={6} accessibilityRole="button">
                <Text style={styles.changeLink}>{editingAddress ? 'Done' : 'Change'}</Text>
              </Pressable>
            ) : null}
          </View>

          {editingAddress ? (
            <View style={styles.addressEditBox}>
              <TextInput
                value={street}
                onChangeText={(t) => {
                  setStreet(t);
                  clear('street');
                }}
                placeholder="Street address (e.g. No. 25, Kandy Road)"
                placeholderTextColor={cc.textSubtle}
                accessibilityLabel="Street address"
                autoComplete="street-address"
                maxLength={150}
                style={[styles.addressEditInput, !!errors.street && styles.inputErrorBorder]}
              />
              <FieldError field="street" />
              <TextInput
                value={city}
                onChangeText={(t) => {
                  setCity(t);
                  clear('city');
                }}
                placeholder={`City / town (e.g. ${provider.serviceArea})`}
                placeholderTextColor={cc.textSubtle}
                accessibilityLabel="City / town"
                maxLength={60}
                style={[styles.addressEditInput, !!errors.city && styles.inputErrorBorder]}
              />
              <FieldError field="city" />
              <TextInput
                value={landmark}
                onChangeText={setLandmark}
                placeholder="Landmark (optional)"
                placeholderTextColor={cc.textSubtle}
                accessibilityLabel="Landmark (optional)"
                maxLength={100}
                style={styles.addressEditInput}
              />
            </View>
          ) : (
            <View style={styles.addressDisplayBox}>
              <Ionicons name="location-outline" size={20} color={cc.primary} style={styles.addressPin} />
              <View style={styles.addressTextWrap}>
                <Text style={styles.addressMain}>
                  {street}, {city}
                </Text>
                {landmark ? <Text style={styles.addressSub}>Landmark: {landmark}</Text> : null}
              </View>
            </View>
          )}
        </View>

        {/* PROBLEM DESCRIPTION */}
        <View style={styles.fieldBlock}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.inputUpperLabel}>PROBLEM DESCRIPTION</Text>
            <Text style={styles.voiceNoteText}>
              {problem.length}/{MAX_PROBLEM_LENGTH}
            </Text>
          </View>
          <View style={[styles.problemBox, !!errors.problem && styles.inputErrorBorder]}>
            <TextInput
              value={problem}
              onChangeText={(t) => {
                setProblem(t);
                clear('problem');
              }}
              placeholder="e.g. Main kitchen tap leaking steadily under sink. Needs washer or valve check."
              placeholderTextColor={cc.textSubtle}
              accessibilityLabel="Problem description"
              multiline
              maxLength={MAX_PROBLEM_LENGTH}
              style={styles.problemInput}
            />
          </View>
          <FieldError field="problem" />
        </View>
      </CCard>

      {/* Estimated Price Breakdown */}
      <CCard style={styles.cardSection}>
        <View style={styles.sectionTitleWrap}>
          <Ionicons name="receipt-outline" size={20} color={cc.primary} />
          <Text style={styles.sectionTitle}>Estimated Price Breakdown</Text>
        </View>

        <View style={styles.priceLine}>
          <Text style={styles.priceLineLabel}>{service?.name ?? 'Service'}</Text>
          <Text style={styles.priceLineVal}>{formatLKR(service?.price ?? 0)}</Text>
        </View>
        <View style={styles.priceLine}>
          <Text style={styles.priceLineLabel}>Service Visiting Fee</Text>
          <Text style={styles.priceLineVal}>{provider.visitFee > 0 ? formatLKR(provider.visitFee) : 'Free'}</Text>
        </View>

        <View style={styles.totalEstimatedBox}>
          <View style={styles.totalLeft}>
            <Text style={styles.totalEstimatedTitle}>Total Estimated</Text>
            <Text style={styles.totalEstimatedSub}>Final quote may change after inspection</Text>
          </View>
          <Text style={styles.totalEstimatedAmount}>{formatLKR(total)}</Text>
        </View>
      </CCard>

      {/* Payment Method (cash on service is the only method) */}
      <CCard style={styles.paymentCard}>
        <View style={styles.paymentIconTile}>
          <MaterialCommunityIcons name="cash-multiple" size={24} color={cc.amber} />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentLabel}>PAYMENT METHOD</Text>
          <View style={styles.paymentValueRow}>
            <Text style={styles.paymentValueText}>Cash on Service</Text>
            <View style={styles.paymentGreenDot} />
          </View>
        </View>
      </CCard>

      <View style={styles.lockRow}>
        <Ionicons name="lock-closed-outline" size={15} color={cc.textMuted} />
        <Text style={styles.lockText}>Your contact details are shared only after provider confirmation.</Text>
      </View>

      <CustomerButton
        title={booking ? 'SAVE CHANGES' : 'CONFIRM BOOKING'}
        icon="arrow-forward"
        variant="bright"
        large
        onPress={handleSubmit}
        loading={submitting}
        disabled={!availability.isAvailable && !booking}
      />
      <Text style={styles.cancelPolicyText}>You can cancel any time before the provider is on the way.</Text>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 6, paddingBottom: 28, gap: 16 },
  subNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    minHeight: 28,
  },
  subBack: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  subBackText: { fontFamily: cf.semibold, fontSize: 15, color: cc.primary },
  subCenterText: { fontFamily: cf.semibold, fontSize: 12, color: cc.textSubtle, letterSpacing: 1 },
  subCancelText: { fontFamily: cf.semibold, fontSize: 15, color: cc.danger },
  providerCard: { padding: 16, gap: 12 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerInfo: { flex: 1, minWidth: 0, gap: 2 },
  nameProRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  providerName: { fontFamily: cf.headingSemi, fontSize: 17, color: cc.text },
  proPill: { backgroundColor: cc.primaryFixed, paddingHorizontal: 6, paddingVertical: 2 },
  proText: { fontFamily: cf.bold, fontSize: 10, color: cc.primary },
  providerSub: { fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNumber: { fontFamily: cf.bold, fontSize: 13, color: cc.text },
  jobsMeta: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  feeWrap: { alignItems: 'flex-end', flexShrink: 0 },
  feeLabel: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.6 },
  feeAmount: { fontFamily: cf.heading, fontSize: 18, color: cc.primary, marginTop: 2 },
  guaranteeWell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  guaranteeWellText: { flex: 1, fontFamily: cf.medium, fontSize: 12, color: cc.textMuted },
  cardSection: { padding: 16, gap: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: cf.headingSemi, fontSize: 16, color: cc.text },
  timeZoneText: { fontFamily: cf.medium, fontSize: 12, color: cc.textMuted },
  twoColRow: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, gap: 6 },
  inputUpperLabel: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.6 },
  pillInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  pillInputText: { flex: 1, fontFamily: cf.semibold, fontSize: 13, color: cc.text },
  daysScroll: { gap: 8, paddingVertical: 4 },
  dayChip: {
    backgroundColor: cc.container,
    borderRadius: cr.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayChipActive: { backgroundColor: cc.primary },
  dayChipText: { fontFamily: cf.medium, fontSize: 12, color: cc.text },
  dayChipTextActive: { color: cc.onPrimary, fontFamily: cf.semibold },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  slotChip: {
    backgroundColor: cc.container,
    borderRadius: cr.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  slotChipActive: { backgroundColor: cc.primary },
  slotChipText: { fontFamily: cf.medium, fontSize: 12, color: cc.text },
  slotChipTextActive: { color: cc.onPrimary, fontFamily: cf.semibold },
  fieldBlock: { gap: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  changeLink: { fontFamily: cf.semibold, fontSize: 13, color: cc.primary },
  voiceNoteText: { fontFamily: cf.medium, fontSize: 11, color: cc.textMuted },
  addressDisplayBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    padding: 12,
  },
  addressPin: { marginTop: 2 },
  addressTextWrap: { flex: 1, gap: 3 },
  addressMain: { fontFamily: cf.semibold, fontSize: 14, color: cc.text },
  addressSub: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted, lineHeight: 17 },
  addressEditBox: { gap: 8 },
  addressEditInput: {
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: cf.body,
    fontSize: 14,
    color: cc.text,
  },
  problemBox: {
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    padding: 12,
    gap: 10,
  },
  problemInput: {
    fontFamily: cf.body,
    fontSize: 14,
    lineHeight: 20,
    color: cc.text,
    minHeight: 52,
    textAlignVertical: 'top',
  },
  problemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagChipsRow: { flexDirection: 'row', gap: 6 },
  problemChip: {
    backgroundColor: cc.containerHigh,
    borderRadius: cr.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  problemChipText: { fontFamily: cf.medium, fontSize: 11, color: cc.text },
  cameraIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cc.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noHiddenFeesWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noHiddenFeesText: { fontFamily: cf.semibold, fontSize: 11, color: cc.success },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLineLabel: { fontFamily: cf.body, fontSize: 14, color: cc.text },
  priceLineVal: { fontFamily: cf.medium, fontSize: 14, color: cc.text },
  totalEstimatedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    padding: 14,
    marginTop: 4,
  },
  totalLeft: { gap: 2 },
  totalEstimatedTitle: { fontFamily: cf.headingSemi, fontSize: 16, color: cc.text },
  totalEstimatedSub: { fontFamily: cf.body, fontSize: 11, color: cc.textMuted },
  totalEstimatedAmount: { fontFamily: cf.heading, fontSize: 20, color: cc.primary },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  paymentIconTile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cc.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: { flex: 1, gap: 2 },
  paymentLabel: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.6 },
  paymentValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paymentValueText: { fontFamily: cf.headingSemi, fontSize: 15, color: cc.text },
  paymentGreenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: cc.success },
  changeBracketText: { fontFamily: cf.semibold, fontSize: 13, color: cc.primary },
  lockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  lockText: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted, textAlign: 'center' },
  cancelPolicyText: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted, textAlign: 'center', marginTop: -6 },
  flex: { flex: 1 },
  serviceChip: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexBasis: '100%' },
  chipDisabled: { opacity: 0.4 },
  chipTextDisabled: { textDecorationLine: 'line-through' },
  inputErrorBorder: { borderWidth: 1.5, borderColor: cc.danger },
  fieldErrorText: { fontFamily: cf.medium, fontSize: 12, color: cc.danger },
});
