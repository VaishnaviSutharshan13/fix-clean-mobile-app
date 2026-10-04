import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type Props = { message: string; tone?: 'error' | 'info' | 'success' };

// Inline banner for form-level feedback (e.g. invalid credentials, network errors).
export default function FormMessage({ message, tone = 'error' }: Props) {
  const palette = {
    error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as const },
    info: { bg: colors.primarySoft, fg: colors.primary, icon: 'information-circle' as const },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' as const },
  }[tone];

  return (
    <View
      style={[styles.container, { backgroundColor: palette.bg }]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <Text style={[styles.text, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  text: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
});
