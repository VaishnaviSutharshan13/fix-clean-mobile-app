import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import type { NoticeTone, StatusChangeNotice } from '../utils/bookingProgress';
import { STATUS_META } from '../utils/display';

const TONES: Record<NoticeTone, { bg: string; fg: string; border: string }> = {
  success: { bg: colors.successSoft, fg: colors.success, border: colors.success },
  info: { bg: colors.primarySoft, fg: colors.primary, border: colors.primary },
  warning: { bg: colors.warningSoft, fg: colors.warning, border: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
};

type Props = { notice: StatusChangeNotice; onDismiss: () => void };

// In-app booking status notification (FR3), shown at the top of Track Booking.
export default function StatusChangeBanner({ notice, onDismiss }: Props) {
  const tone = TONES[notice.tone];
  return (
    <View
      style={[styles.banner, { backgroundColor: tone.bg, borderColor: tone.border }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID="status-change-banner"
    >
      <View style={[styles.icon, { backgroundColor: tone.fg }]}>
        <Ionicons name={STATUS_META[notice.status].icon} size={20} color={colors.white} />
      </View>
      <View style={styles.text}>
        <Text style={styles.eyebrow}>BOOKING UPDATE</Text>
        <Text style={[styles.title, { color: tone.fg }]}>{notice.title}</Text>
        <Text style={styles.message}>{notice.message}</Text>
      </View>
      <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss notification">
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },
  title: { fontSize: 16, fontWeight: '800' },
  message: { fontSize: 13, lineHeight: 18, color: colors.text },
});
