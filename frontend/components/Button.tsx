import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export default function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  style,
  accessibilityHint,
}: ButtonProps) {
  const inactive = disabled || loading;
  const palette = PALETTES[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && !inactive && { opacity: 0.85 },
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.text, { color: palette.text }]}>{title}</Text>
          {icon ? <Ionicons name={icon} size={18} color={palette.text} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const PALETTES: Record<Variant, { background: string; text: string; border: string }> = {
  primary: { background: colors.primary, text: colors.white, border: colors.primary },
  secondary: { background: colors.surface, text: colors.primary, border: colors.primary },
  danger: { background: colors.dangerSoft, text: colors.danger, border: colors.dangerSoft },
  ghost: { background: 'transparent', text: colors.primary, border: 'transparent' },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  inactive: { opacity: 0.55 },
});
