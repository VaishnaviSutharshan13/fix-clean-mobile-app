import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ac, af, ar, cardShadow } from '../../constants/adminTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Building blocks matching the Admin Figma frames.

export function ACard({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return (
    <View style={[styles.card, accent ? { borderTopWidth: 6, borderTopColor: accent } : null, style]}>{children}</View>
  );
}

export function Well({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.well, style]}>{children}</View>;
}

// "← Back to Dashboard" row with an optional chip on the right.
export function BackLink({ label, onPress, right, caps }: { label: string; onPress: () => void; right?: ReactNode; caps?: boolean }) {
  return (
    <View style={styles.backRow}>
      <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} style={styles.backLink}>
        <Ionicons name="arrow-back" size={caps ? 15 : 18} color={caps ? ac.primary : ac.textMuted} />
        <Text style={[styles.backText, caps && styles.backCaps]}>{label}</Text>
      </Pressable>
      {right}
    </View>
  );
}

export function PageTitle({ title, subtitle, right, live }: { title: string; subtitle?: string; right?: ReactNode; live?: boolean }) {
  return (
    <View style={styles.titleWrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {right}
      </View>
      {subtitle ? (
        live ? (
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{subtitle}</Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )
      ) : null}
    </View>
  );
}

// Small rounded tag, optionally with a leading dot (e.g. "● QUEUE: 7 TOTAL").
export function Tag({ label, bg = ac.containerHigh, fg = ac.textMuted, dot, icon }: { label: string; bg?: string; fg?: string; dot?: string; icon?: IconName }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      {dot ? <View style={[styles.tagDot, { backgroundColor: dot }]} /> : null}
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.tagText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

type ButtonTone = 'primary' | 'light' | 'success' | 'danger' | 'dangerSoft' | 'dark';
const TONES: Record<ButtonTone, { bg: string; fg: string }> = {
  primary: { bg: ac.primary, fg: ac.onPrimary },
  light: { bg: ac.container, fg: ac.primary },
  success: { bg: ac.success, fg: ac.onPrimary },
  danger: { bg: ac.errorContainer, fg: ac.error },
  dangerSoft: { bg: ac.errorSoft, fg: ac.error },
  dark: { bg: ac.dark, fg: ac.onPrimary },
};

// Figma buttons: 12px radius, bold label, optional icon left or right.
export function AButton({
  label,
  onPress,
  tone = 'primary',
  icon,
  iconRight,
  loading,
  disabled,
  caps,
  small,
  style,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  caps?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const t = TONES[tone];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: t.bg },
        pressed && !inactive && { opacity: 0.88 },
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={t.fg} /> : null}
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, caps && styles.caps, { color: t.fg }]} numberOfLines={2}>
            {label}
          </Text>
          {iconRight ? <Ionicons name={iconRight} size={small ? 16 : 19} color={t.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

// Square icon tile used in cards and list rows.
export function IconTile({ icon, bg = ac.containerHigh, fg = ac.primary, size = 36 }: { icon: IconName; bg?: string; fg?: string; size?: number }) {
  return (
    <View style={[styles.iconTile, { backgroundColor: bg, width: size, height: size, borderRadius: size > 40 ? 12 : 10 }]}>
      <Ionicons name={icon} size={Math.round(size * 0.55)} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: ac.card, borderRadius: ar.lg, padding: 16, gap: 12, overflow: 'hidden', ...cardShadow },
  well: { backgroundColor: ac.containerLow, borderRadius: ar.md, padding: 12, gap: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  backText: { fontFamily: af.semibold, fontSize: 15, color: ac.primary },
  backCaps: { fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' },
  titleWrap: { gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontFamily: af.heading, fontSize: 26, lineHeight: 32, color: ac.text, letterSpacing: -0.6 },
  subtitle: { fontFamily: af.body, fontSize: 14, lineHeight: 20, color: ac.textMuted },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ac.success },
  liveText: { flex: 1, fontFamily: af.bold, fontSize: 12, color: ac.success, letterSpacing: 0.5, textTransform: 'uppercase' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: ar.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  tagDot: { width: 7, height: 7, borderRadius: 4 },
  tagText: { fontFamily: af.bold, fontSize: 12, letterSpacing: 0.3, flexShrink: 1 },
  sectionLabel: { fontFamily: af.semibold, fontSize: 13, color: ac.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },
  button: {
    minHeight: 52,
    borderRadius: ar.md,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 42, paddingHorizontal: 14, borderRadius: ar.md },
  buttonText: { fontFamily: af.bold, fontSize: 16, textAlign: 'center', flexShrink: 1 },
  buttonTextSmall: { fontSize: 14, fontFamily: af.semibold },
  caps: { textTransform: 'uppercase', letterSpacing: 0.4 },
  inactive: { opacity: 0.5 },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
});
