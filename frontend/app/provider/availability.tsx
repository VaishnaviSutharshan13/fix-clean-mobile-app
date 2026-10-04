import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import ProviderHeader from '../../components/provider/ProviderHeader';
import ProviderTabBar from '../../components/provider/ProviderTabBar';
import ServicesRatesCard from '../../components/provider/ServicesRatesCard';
import StateView from '../../components/StateView';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { providerPortalService } from '../../services/providerPortalService';
import type { Availability } from '../../types/provider';
import { formatDateTime, formatTimeSlot } from '../../utils/display';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import {
  isShiftOn,
  offDaysNotice,
  SHIFTS,
  toggleDay,
  toggleShift,
  WEEKDAY_LETTER,
  WEEKDAY_NAME,
  WEEKDAY_ORDER,
} from '../../utils/providerSchedule';

function sameAvailability(a: Availability, b: Availability): boolean {
  return (
    a.isAvailable === b.isAvailable &&
    a.workingDays.join() === b.workingDays.join() &&
    a.timeSlots.join() === b.timeSlots.join()
  );
}

// Manage Availability (Milestone 02 Variant B / Figma "Schedule"): duty status,
// working days and shift windows, saved to MongoDB (FR5). Customers can only
// book the days and arrival windows switched on here. The Services & Rates
// card below lets the provider propose services and prices for verification.
export default function ManageAvailability() {
  const { data: account, error, loading, reload } = useAsync(() => providerPortalService.me(), []);
  const [draft, setDraft] = useState<Availability>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>();
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setDraft(account.availability);
      setSyncedAt(account.availabilityUpdatedAt);
    }
  }, [account]);

  const dirty = useMemo(
    () => !!account && !!draft && !sameAvailability(account.availability, draft),
    [account, draft],
  );

  if (loading && !account) return <Loading message="Loading availability…" />;
  if (!account || !draft) {
    return (
      <SafeAreaView style={styles.safe}>
        <ProviderHeader title="Schedule" />
        <StateView
          title="Couldn't load your availability"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      </SafeAreaView>
    );
  }

  const update = (next: Partial<Availability>) => {
    setDraft((d) => ({ ...d!, ...next }));
    setMessage(undefined);
  };

  const save = async () => {
    if (draft.isAvailable && (draft.workingDays.length === 0 || draft.timeSlots.length === 0)) {
      setMessage({
        tone: 'error',
        text: 'Choose at least one working day and one shift window, or switch duty status off.',
      });
      return;
    }
    setSaving(true);
    setMessage(undefined);
    try {
      const saved = await providerPortalService.updateAvailability(draft);
      setDraft(saved.availability);
      setSyncedAt(saved.availabilityUpdatedAt);
      await reload(true);
      setMessage({ tone: 'success', text: 'Availability updated successfully.' });
    } catch (err) {
      setMessage({ tone: 'error', text: getFriendlyErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const activeShifts = SHIFTS.filter((s) => isShiftOn(draft.timeSlots, s)).length;
  const notice = offDaysNotice(draft.workingDays);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ProviderHeader title="Schedule" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Set when you accept new jobs. Customers can only book the days and arrival windows you switch on.
        </Text>

        {/* Duty status */}
        <View style={styles.card}>
          <View style={styles.dutyRow}>
            <View style={[styles.dutyDot, !draft.isAvailable && styles.dutyDotOff]} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Duty Status: {draft.isAvailable ? 'Active' : 'Off duty'}</Text>
              <Text style={[styles.dutySub, !draft.isAvailable && { color: colors.textMuted }]}>
                {draft.isAvailable ? 'Accepting new booking requests' : 'Not accepting new bookings'}
              </Text>
            </View>
            <Pressable
              onPress={() => update({ isAvailable: !draft.isAvailable })}
              style={[styles.toggle, draft.isAvailable && styles.toggleOn]}
              accessibilityRole="switch"
              accessibilityState={{ checked: draft.isAvailable }}
              accessibilityLabel="Duty status"
            >
              <View style={[styles.knob, draft.isAvailable && styles.knobOn]}>
                <Ionicons name="flash" size={14} color={draft.isAvailable ? colors.primary : colors.textSubtle} />
              </View>
            </Pressable>
          </View>
          <View style={styles.areaRow}>
            <Ionicons name="navigate-outline" size={15} color={colors.textMuted} />
            <Text style={styles.areaText}>Accepting job requests in {account.serviceArea}</Text>
          </View>
        </View>

        {/* Working days */}
        <View style={[styles.card, !draft.isAvailable && styles.dimmed]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Working Days</Text>
              <Text style={styles.cardSub}>{draft.workingDays.length} of 7 Active Days selected</Text>
            </View>
            <View style={styles.rosterChip}>
              <Text style={styles.rosterText}>WEEKLY ROSTER</Text>
            </View>
          </View>
          <View style={styles.days}>
            {WEEKDAY_ORDER.map((day) => {
              const on = draft.workingDays.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => update({ workingDays: toggleDay(draft.workingDays, day) })}
                  style={[styles.day, on && styles.dayOn]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={WEEKDAY_NAME[day]}
                >
                  <Text style={[styles.dayLetter, on && styles.dayTextOn]}>{WEEKDAY_LETTER[day]}</Text>
                  <Text style={[styles.dayState, on && styles.dayTextOn]}>{on ? 'ON' : 'OFF'}</Text>
                </Pressable>
              );
            })}
          </View>
          {notice ? (
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}
        </View>

        {/* Shift windows */}
        <View style={[styles.card, !draft.isAvailable && styles.dimmed]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Shift Windows</Text>
              <Text style={styles.cardSub}>
                {activeShifts} Active / {SHIFTS.length - activeShifts} Idle
              </Text>
            </View>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
          </View>
          {SHIFTS.map((shift) => {
            const on = isShiftOn(draft.timeSlots, shift);
            return (
              <Pressable
                key={shift.key}
                onPress={() => update({ timeSlots: toggleShift(draft.timeSlots, shift) })}
                style={[styles.shift, on ? styles.shiftOn : styles.shiftOff]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${shift.label}, ${shift.range}`}
              >
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.shiftLabel, !on && styles.shiftLabelOff]}>{shift.label}</Text>
                  <View style={styles.rangeChip}>
                    <Text style={styles.rangeText}>{shift.range}</Text>
                  </View>
                  <Text style={styles.shiftSub}>
                    Customer arrival windows: {shift.slots.map((s) => formatTimeSlot(s)).join(', ')}
                  </Text>
                </View>
                <Text style={styles.shiftAction}>{on ? 'On' : '+ Add'}</Text>
              </Pressable>
            );
          })}
        </View>

        {message ? <FormMessage message={message.text} tone={message.tone} /> : null}

        <Pressable
          style={[styles.save, (!dirty || saving) && styles.saveDisabled]}
          onPress={save}
          disabled={!dirty || saving}
          accessibilityRole="button"
          accessibilityLabel="Save availability"
          accessibilityState={{ disabled: !dirty || saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.saveText}>{dirty ? 'SAVE AVAILABILITY' : 'AVAILABILITY SAVED'}</Text>
              <Ionicons name={dirty ? 'arrow-forward' : 'checkmark'} size={20} color={colors.white} />
            </>
          )}
        </Pressable>
        <View style={styles.synced}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.syncedText}>
            {syncedAt ? `Last saved ${formatDateTime(syncedAt)}` : 'Using default availability (every day, all windows)'}
          </Text>
        </View>

        {/* Services & Rates: proposed by the provider, approved during verification. */}
        <ServicesRatesCard account={account} onSaved={() => void reload(true)} />
      </ScrollView>
      <ProviderTabBar active="schedule" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.lavender },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  intro: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  dimmed: { opacity: 0.55 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 19, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  dutyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dutyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  dutyDotOff: { backgroundColor: colors.textSubtle },
  dutySub: { fontSize: 13, fontWeight: '600', color: colors.success },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderStrong,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.primary },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobOn: { alignSelf: 'flex-end' },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lavender,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  areaText: { flex: 1, fontSize: 13, color: colors.text },
  rosterChip: { backgroundColor: '#CFE3F7', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  rosterText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark, letterSpacing: 0.4 },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: radius.md,
    backgroundColor: colors.lavenderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.primary },
  dayLetter: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  dayState: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  dayTextOn: { color: colors.white },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.orangeSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.text },
  shift: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.md, padding: spacing.md },
  shiftOn: { backgroundColor: colors.lavender },
  shiftOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  shiftLabel: { fontSize: 18, fontWeight: '600', color: colors.text },
  shiftLabelOff: { color: colors.textMuted },
  rangeChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#DDE6F8',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 4,
  },
  rangeText: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
  shiftSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  shiftAction: { fontSize: 14, fontWeight: '700', color: colors.primary },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { fontSize: 17, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },
  synced: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  syncedText: { fontSize: 12, color: colors.textMuted },
});
