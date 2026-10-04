import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type Props = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

// Selectable pill used for filters, dates and time windows.
export default function Chip({ label, selected, disabled, onPress, icon }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={[styles.chip, selected && styles.selected, disabled && styles.disabled]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? colors.white : colors.textMuted} /> : null}
      <Text style={[styles.text, selected && styles.selectedText, disabled && styles.disabledText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    minHeight: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabled: { backgroundColor: colors.background, borderColor: colors.border },
  text: { fontSize: 13, fontWeight: '600', color: colors.text },
  selectedText: { color: colors.white },
  disabledText: { color: colors.textSubtle, textDecorationLine: 'line-through' },
});
