import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { providerPortalService } from '../../services/providerPortalService';
import type { ProviderAccount } from '../../types/provider';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import {
  hasServiceErrors,
  MAX_SERVICES,
  SERVICE_SUGGESTIONS,
  toServicesPayload,
  validateServices,
  type ServiceDraft,
  type ServicesErrors,
} from '../../utils/providerServices';
import FormMessage from '../FormMessage';

type Props = { account: ProviderAccount; onSaved: (account: ProviderAccount) => void };

function toDrafts(account: ProviderAccount): ServiceDraft[] {
  return account.services.map((s) => ({ id: s.id, name: s.name, price: String(s.price) }));
}

// "Services & Rates" section of Manage Availability. The provider proposes
// the services they offer and their prices; an administrator approves them
// together with the profile during verification. Customers only see
// providers that are verified and have at least one service.
export default function ServicesRatesCard({ account, onSaved }: Props) {
  const [drafts, setDrafts] = useState<ServiceDraft[]>(() => toDrafts(account));
  const [visitFee, setVisitFee] = useState(String(account.visitFee));
  const [errors, setErrors] = useState<ServicesErrors>({ rows: {} });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>();

  useEffect(() => {
    setDrafts(toDrafts(account));
    setVisitFee(String(account.visitFee));
  }, [account]);

  const dirty = useMemo(() => {
    const saved = JSON.stringify(toServicesPayload(toDrafts(account), String(account.visitFee)));
    return saved !== JSON.stringify(toServicesPayload(drafts, visitFee));
  }, [account, drafts, visitFee]);

  const suggestions = SERVICE_SUGGESTIONS[account.category].filter(
    (name) => !drafts.some((d) => d.name.trim().toLowerCase() === name.toLowerCase()),
  );

  const change = (index: number, patch: Partial<ServiceDraft>) => {
    setDrafts((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)));
    setMessage(undefined);
    if (errors.rows[index]) setErrors((e) => ({ ...e, rows: { ...e.rows, [index]: undefined as never } }));
  };

  const add = (name = '') => {
    if (drafts.length >= MAX_SERVICES) return;
    setDrafts((list) => [...list, { name, price: '' }]);
    setMessage(undefined);
  };

  const remove = (index: number) => {
    setDrafts((list) => list.filter((_, i) => i !== index));
    setErrors({ rows: {} });
    setMessage(undefined);
  };

  const save = async () => {
    const next = validateServices(drafts, visitFee);
    setErrors(next);
    if (hasServiceErrors(next)) {
      setMessage({ tone: 'error', text: next.list ?? next.visitFee ?? 'Please fix the highlighted services.' });
      return;
    }
    setSaving(true);
    setMessage(undefined);
    try {
      const saved = await providerPortalService.updateServices(toServicesPayload(drafts, visitFee));
      onSaved(saved);
      setMessage({
        tone: 'success',
        text:
          saved.verificationStatus === 'verified'
            ? 'Services & rates updated successfully.'
            : 'Services & rates saved. They will be reviewed with your verification.',
      });
    } catch (err) {
      setMessage({ tone: 'error', text: getFriendlyErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card} testID="services-rates">
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Services &amp; Rates</Text>
          <Text style={styles.sub}>
            {drafts.length} {drafts.length === 1 ? 'service' : 'services'} • reviewed during verification
          </Text>
        </View>
        <View style={styles.rateChip}>
          <Text style={styles.rateChipText}>LKR</Text>
        </View>
      </View>

      {account.services.length === 0 ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
          <Text style={styles.noticeText}>
            Add the services you offer and your prices. Customers can book you once an administrator verifies your
            profile and these services.
          </Text>
        </View>
      ) : null}

      {drafts.map((draft, index) => (
        <View key={draft.id ?? `new-${index}`} style={styles.rowWrap}>
          <View style={[styles.row, !!errors.rows[index] && styles.rowError]}>
            <TextInput
              value={draft.name}
              onChangeText={(name) => change(index, { name })}
              placeholder="Service name"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, styles.nameInput]}
              maxLength={60}
              accessibilityLabel={`Service ${index + 1} name`}
            />
            <View style={styles.priceBox}>
              <Text style={styles.rs}>Rs.</Text>
              <TextInput
                value={draft.price}
                onChangeText={(price) => change(index, { price })}
                placeholder="0"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, styles.priceInput]}
                keyboardType="number-pad"
                maxLength={7}
                accessibilityLabel={`Service ${index + 1} price in rupees`}
              />
            </View>
            <Pressable
              onPress={() => remove(index)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove service ${index + 1}`}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
          {errors.rows[index] ? <Text style={styles.error}>{errors.rows[index]}</Text> : null}
        </View>
      ))}

      {drafts.length < MAX_SERVICES ? (
        <>
          {suggestions.length > 0 ? (
            <View style={styles.suggestions}>
              {suggestions.map((name) => (
                <Pressable
                  key={name}
                  style={styles.suggestion}
                  onPress={() => add(name)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${name}`}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={styles.suggestionText}>{name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Pressable style={styles.addButton} onPress={() => add()} accessibilityRole="button">
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.addText}>Add another service</Text>
          </Pressable>
        </>
      ) : null}

      <View style={styles.feeRow}>
        <View style={styles.flex}>
          <Text style={styles.feeLabel}>Visiting fee</Text>
          <Text style={styles.feeHint}>Added to every booking (0 if none)</Text>
        </View>
        <View style={[styles.priceBox, styles.feeBox, !!errors.visitFee && styles.rowError]}>
          <Text style={styles.rs}>Rs.</Text>
          <TextInput
            value={visitFee}
            onChangeText={(v) => {
              setVisitFee(v);
              setMessage(undefined);
              if (errors.visitFee) setErrors((e) => ({ ...e, visitFee: undefined }));
            }}
            style={[styles.input, styles.priceInput]}
            keyboardType="number-pad"
            maxLength={5}
            accessibilityLabel="Visiting fee in rupees"
          />
        </View>
      </View>
      {errors.visitFee ? <Text style={styles.error}>{errors.visitFee}</Text> : null}

      {message ? <FormMessage message={message.text} tone={message.tone} /> : null}

      <Pressable
        style={[styles.save, (!dirty || saving) && styles.saveDisabled]}
        onPress={save}
        disabled={!dirty || saving}
        accessibilityRole="button"
        accessibilityLabel="Save services and rates"
        accessibilityState={{ disabled: !dirty || saving, busy: saving }}
      >
        {saving ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.saveText}>{dirty ? 'SAVE SERVICES & RATES' : 'SERVICES & RATES SAVED'}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { fontSize: 19, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  rateChip: { backgroundColor: colors.orangeSoft, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  rateChipText: { fontSize: 11, fontWeight: '800', color: '#8A4B00', letterSpacing: 0.4 },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.orangeSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.text },
  rowWrap: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lavender,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.lavender,
  },
  rowError: { borderColor: colors.danger },
  input: { fontSize: 15, color: colors.text, paddingVertical: spacing.sm, minWidth: 0 },
  nameInput: { flex: 1 },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    marginVertical: 6,
    width: 96,
  },
  rs: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  priceInput: { flex: 1, textAlign: 'right' },
  error: { fontSize: 12, color: colors.danger },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lavenderStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    maxWidth: '100%',
  },
  suggestionText: { fontSize: 12, fontWeight: '600', color: colors.primary, flexShrink: 1 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  addText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  feeLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  feeHint: { fontSize: 12, color: colors.textMuted },
  feeBox: { backgroundColor: colors.lavender, marginVertical: 0, width: 110, minHeight: 44 },
  save: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.lavenderStrong,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { fontSize: 15, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
});
