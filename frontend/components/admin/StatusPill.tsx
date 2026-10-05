import { StyleSheet, Text, View } from 'react-native';

import { af } from '../../constants/adminTheme';
import type { PillMeta } from '../../utils/admin';

// Figma status chip: uppercase, bold, leading dot (e.g. "● PENDING REVIEW").
export default function StatusPill({ meta, label, noDot }: { meta: PillMeta; label?: string; noDot?: boolean }) {
  const text = label ?? meta.label;
  return (
    <View style={[styles.pill, { backgroundColor: meta.bg }]} accessibilityLabel={text}>
      {noDot ? null : <View style={[styles.dot, { backgroundColor: meta.fg }]} />}
      <Text style={[styles.text, { color: meta.fg }]} numberOfLines={1}>
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: af.bold, fontSize: 11, letterSpacing: 0.4 },
});
