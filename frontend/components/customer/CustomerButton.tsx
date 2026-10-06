import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { cc, cf, cr } from '../../constants/customerTheme';
import type { IoniconName } from './CustomerPrimitives';

type Variant = 'primary' | 'bright' | 'soft' | 'danger' | 'outline' | 'link';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  // Icon after the label (arrow-forward on the reference CTAs).
  icon?: IoniconName;
  // Icon before the label.
  leadingIcon?: IoniconName;
  loading?: boolean;
  disabled?: boolean;
  // Large uppercase CTA (SIGN IN, COMPLETE SIGN UP, BOOK NOW, TRACK BOOKING).
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  accessibilityLabel?: string;
};

const PALETTE: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: cc.primary, fg: cc.onPrimary, border: cc.primary },
  bright: { bg: cc.primaryBright, fg: cc.onPrimary, border: cc.primaryBright },
  soft: { bg: cc.container, fg: cc.primary, border: cc.container },
  danger: { bg: cc.dangerSurface, fg: cc.danger, border: cc.dangerSurface },
  outline: { bg: cc.card, fg: cc.text, border: cc.outlineSoft },
  link: { bg: 'transparent', fg: cc.primary, border: 'transparent' },
};

export default function CustomerButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  leadingIcon,
  loading,
  disabled,
  large,
  style,
  accessibilityHint,
  accessibilityLabel,
}: Props) {
  const p = PALETTE[variant];
  const inactive = disabled || loading;
  const raised = variant === 'primary' || variant === 'bright';
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        { backgroundColor: p.bg, borderColor: p.border },
        raised && !inactive && styles.raised,
        pressed && !inactive && { opacity: 0.88 },
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.content}>
          {leadingIcon ? <Ionicons name={leadingIcon} size={large ? 20 : 17} color={p.fg} /> : null}
          <Text
            style={[styles.text, large && styles.largeText, { color: p.fg }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {title}
          </Text>
          {icon ? <Ionicons name={icon} size={large ? 20 : 17} color={p.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: cr.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { minHeight: 56, borderRadius: 14 },
  raised: {
    shadowColor: cc.primary,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 1 },
  text: { fontFamily: cf.semibold, fontSize: 15, flexShrink: 1 },
  largeText: { fontFamily: cf.bold, fontSize: 17, letterSpacing: 0.6 },
  inactive: { opacity: 0.55 },
});
