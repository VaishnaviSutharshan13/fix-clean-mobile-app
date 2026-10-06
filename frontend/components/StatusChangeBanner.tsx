import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cc, cf, cr } from '../constants/customerTheme';
import type { NoticeTone, StatusChangeNotice } from '../utils/bookingProgress';
import { STATUS_META } from '../utils/display';

const TONES: Record<NoticeTone, { bg: string; fg: string; border: string }> = {
  success: { bg: cc.successSoft, fg: cc.success, border: cc.success },
  info: { bg: cc.primaryFixed, fg: cc.primary, border: cc.primary },
  warning: { bg: cc.amberSoft, fg: cc.amber, border: cc.amberBright },
  danger: { bg: cc.dangerSoft, fg: cc.danger, border: cc.danger },
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
        <Ionicons name={STATUS_META[notice.status].icon} size={20} color={cc.onPrimary} />
      </View>
      <View style={styles.text}>
        <Text style={styles.eyebrow}>BOOKING UPDATE</Text>
        <Text style={[styles.title, { color: tone.fg }]}>{notice.title}</Text>
        <Text style={styles.message}>{notice.message}</Text>
      </View>
      <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss notification">
        <Ionicons name="close" size={20} color={cc.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: cr.lg,
    borderWidth: 1.5,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  eyebrow: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.8 },
  title: { fontFamily: cf.heading, fontSize: 16 },
  message: { fontFamily: cf.body, fontSize: 13, lineHeight: 18, color: cc.text },
});
