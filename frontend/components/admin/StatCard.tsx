import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ac, af, ar, cardShadow } from '../../constants/adminTheme';

type Props = {
  label: string;
  value: string | number;
  valueColor?: string;
  // Inline element after the number (e.g. "Live" chip, green dot, "Action req.").
  badge?: ReactNode;
  // Secondary line under the number (rich text).
  caption?: ReactNode;
  icon: ComponentProps<typeof Ionicons>['name'];
  tint?: string;
  tintBg?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

// Dashboard KPI card (Figma 1:1519): label + icon tile, large number, caption.
export default function StatCard({ label, value, valueColor = ac.text, badge, caption, icon, tint = ac.primary, tintBg = ac.containerHigh, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onPress && { opacity: 0.88 }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
    >
      <View style={styles.top}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.icon, { backgroundColor: tintBg }]}>
          <Ionicons name={icon} size={17} color={tint} />
        </View>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        {badge}
      </View>
      {caption ? <View style={styles.caption}>{caption}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: ac.card,
    borderRadius: ar.lg,
    padding: 14,
    gap: 6,
    ...cardShadow,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  label: { flex: 1, fontFamily: af.medium, fontSize: 14, color: ac.textMuted },
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  value: { fontFamily: af.heading, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  caption: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
