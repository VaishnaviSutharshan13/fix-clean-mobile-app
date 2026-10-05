import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ac, af } from '../../constants/adminTheme';

// Icon/label + value line inside Figma wells. Long values wrap.
export default function InfoRow({ label, value, icon }: { label?: string; value: string; icon?: ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={17} color={ac.textMuted} style={styles.icon} /> : null}
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text style={[styles.value, !label && styles.valuePlain]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  icon: { marginTop: 1 },
  label: { width: 96, fontFamily: af.body, fontSize: 13, color: ac.textMuted, marginTop: 1 },
  value: { flex: 1, minWidth: 0, fontFamily: af.semibold, fontSize: 14, color: ac.text },
  valuePlain: { fontFamily: af.medium },
});
