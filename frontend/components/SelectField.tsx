import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../constants/theme';

type Option<T> = { label: string; value: T };

type Props<T> = {
  label: string;
  placeholder: string;
  value: T | undefined;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  error?: string;
  required?: boolean;
};

// Dropdown-style field (Figma "Operating District" / "Experience") that opens
// a full-screen list — no extra native picker dependency needed.
export default function SelectField<T extends string | number>({
  label,
  placeholder,
  value,
  options,
  onChange,
  error,
  required,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable
        style={[styles.field, !!error && styles.errored]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'not selected'}`}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <FlatList
            data={options as Option<T>[]}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.label}</Text>
                  {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.xs + 2 },
  label: { ...typography.subheading, fontSize: 14 },
  required: { color: colors.danger },
  field: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  errored: { borderColor: colors.danger },
  value: { flex: 1, fontSize: 15, color: colors.text },
  placeholder: { color: colors.textSubtle },
  error: { fontSize: 12, color: colors.danger },
  modal: { flex: 1, backgroundColor: colors.surface },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { fontSize: 16, color: colors.text },
  optionTextActive: { fontWeight: '700', color: colors.primary },
});
