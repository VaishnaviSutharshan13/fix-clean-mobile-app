import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { cardShadow, cc, cf, cr } from '../../constants/customerTheme';
import type { IoniconName } from './CustomerPrimitives';

export type CustomerInputProps = TextInputProps & {
  label: string;
  // "title": Login ("Email Address"); "upper": Sign Up ("FULL NAME");
  // "small": compact uppercase labels inside booking cards ("DATE").
  labelVariant?: 'title' | 'upper' | 'small';
  // Right side of the label row, e.g. a "✓ Valid" indicator or a link.
  labelRight?: ReactNode;
  error?: string;
  icon?: IoniconName;
  iconColor?: string;
  // Show / hide toggle; the value starts hidden.
  secureToggle?: boolean;
  // "card": white raised field (auth screens); "well": lavender filled field (booking form).
  variant?: 'card' | 'well';
  // Hidden visually but still used as the accessibility label.
  hideLabel?: boolean;
};

const CustomerInput = forwardRef<TextInput, CustomerInputProps>(function CustomerInput(
  {
    label,
    labelVariant = 'upper',
    labelRight,
    error,
    icon,
    iconColor,
    secureToggle,
    variant = 'card',
    hideLabel,
    multiline,
    style,
    ...props
  },
  ref,
) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const labelStyle =
    labelVariant === 'title' ? styles.labelTitle : labelVariant === 'small' ? styles.labelSmall : styles.labelUpper;

  return (
    <View style={styles.container}>
      {hideLabel ? null : (
        <View style={styles.labelRow}>
          <Text style={labelStyle}>{labelVariant === 'title' ? label : label.toUpperCase()}</Text>
          {labelRight}
        </View>
      )}
      <View
        style={[
          styles.field,
          variant === 'card' ? styles.card : styles.well,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={21} color={iconColor ?? cc.textMuted} style={multiline ? styles.iconTop : undefined} />
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={cc.textSubtle}
          accessibilityLabel={label}
          secureTextEntry={secureToggle ? hidden : props.secureTextEntry}
          multiline={multiline}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
          >
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={22} color={cc.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

export default CustomerInput;

// "✓ Valid" style indicator shown at the right of a field label.
export function FieldStatus({ label, tone = 'success' }: { label: string; tone?: 'success' | 'danger' }) {
  const color = tone === 'success' ? cc.success : cc.danger;
  return (
    <View style={styles.status} accessibilityLabel={label}>
      <Ionicons name={tone === 'success' ? 'checkmark' : 'alert-circle-outline'} size={15} color={color} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  labelTitle: { fontFamily: cf.semibold, fontSize: 15, color: cc.text },
  labelUpper: { fontFamily: cf.semibold, fontSize: 14, color: cc.text, letterSpacing: 0.4 },
  labelSmall: { fontFamily: cf.semibold, fontSize: 11, color: cc.textMuted, letterSpacing: 0.6 },
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  card: { backgroundColor: cc.card, borderColor: cc.card, ...cardShadow, shadowOpacity: 0.04 },
  well: { backgroundColor: cc.container, borderColor: cc.container, borderRadius: cr.md, minHeight: 48 },
  multiline: { alignItems: 'flex-start', paddingVertical: 10 },
  focused: { borderColor: cc.primary },
  errored: { borderColor: cc.danger },
  iconTop: { marginTop: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: cf.body,
    fontSize: 16,
    color: cc.text,
    paddingVertical: 10,
    // The field border shows focus; hide the extra browser outline on web.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top', lineHeight: 22 },
  error: { fontFamily: cf.medium, fontSize: 12, color: cc.danger },
  status: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusText: { fontFamily: cf.semibold, fontSize: 14 },
});
