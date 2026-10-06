import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { cardShadow, cc, cf, cr } from '../../constants/customerTheme';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];
export type McIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// White rounded card with the soft reference shadow.
export function CCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Uppercase section heading ("CATEGORIES", "RECOMMENDED FOR YOU") or a
// title-case one ("Services Offered") with an optional right-hand element.
export function SectionTitle({
  title,
  right,
  upper,
  dot,
}: {
  title: string;
  right?: ReactNode;
  upper?: boolean;
  dot?: boolean;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        <Text style={upper ? styles.sectionUpper : styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {dot ? <View style={styles.sectionDot} /> : null}
      </View>
      {right}
    </View>
  );
}

type PillTone = 'verified' | 'soft' | 'success' | 'amber' | 'danger' | 'primary';

const PILL_TONES: Record<PillTone, { bg: string; fg: string }> = {
  verified: { bg: cc.successBright, fg: cc.onSuccessBright },
  success: { bg: cc.successSoft, fg: cc.success },
  soft: { bg: cc.containerHigh, fg: cc.primary },
  amber: { bg: cc.amberSoft, fg: cc.amber },
  danger: { bg: cc.dangerSoft, fg: cc.danger },
  primary: { bg: cc.primary, fg: cc.onPrimary },
};

// Small rounded badge ("Verified", "Verified Pro", "ID #FC-…").
export function Pill({
  label,
  tone = 'soft',
  icon,
  style,
  textStyle,
}: {
  label: string;
  tone?: PillTone;
  icon?: IoniconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const t = PILL_TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <Text style={[styles.pillText, { color: t.fg }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// Rounded square icon well (category tiles, stats, payment method).
export function IconTile({
  icon,
  mc,
  color,
  bg,
  size = 44,
  round,
}: {
  icon: string;
  // true when `icon` is a MaterialCommunityIcons glyph.
  mc?: boolean;
  color: string;
  bg: string;
  size?: number;
  round?: boolean;
}) {
  const glyph = Math.round(size * 0.5);
  return (
    <View
      style={[styles.tile, { width: size, height: size, backgroundColor: bg, borderRadius: round ? size / 2 : cr.md }]}
      importantForAccessibility="no"
      accessibilityElementsHidden
    >
      {mc ? (
        <MaterialCommunityIcons name={icon as McIconName} size={glyph} color={color} />
      ) : (
        <Ionicons name={icon as IoniconName} size={glyph} color={color} />
      )}
    </View>
  );
}

// Small uppercase field label ("DATE", "SERVICE ADDRESS").
export function FieldLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.fieldLabel, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: cc.card, borderRadius: cr.lg, padding: 16, gap: 12, ...cardShadow },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  sectionUpper: { fontFamily: cf.heading, fontSize: 16, color: cc.text, letterSpacing: 0.8 },
  sectionTitle: { fontFamily: cf.headingSemi, fontSize: 18, color: cc.text, flexShrink: 1 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: cc.primary },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: cr.full,
  },
  pillText: { fontFamily: cf.semibold, fontSize: 12 },
  tile: { alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.6 },
});
