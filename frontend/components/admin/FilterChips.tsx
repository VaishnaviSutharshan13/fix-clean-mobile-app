import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ac, af } from '../../constants/adminTheme';

type Option<K> = { key: K; label: string; count?: number };

// Figma filter pills ("All 7", "Plumbing (3)"): filled primary when selected,
// light tonal otherwise, count in a small badge. Scrolls horizontally.
export default function FilterChips<K>({
  options,
  value,
  onChange,
}: {
  options: Option<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={String(option.key)}
            onPress={() => onChange(option.key)}
            style={[styles.chip, selected && styles.chipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.count === undefined ? option.label : `${option.label} (${option.count})`}
          >
            <Text style={[styles.label, selected && styles.labelOn]}>{option.label}</Text>
            {option.count !== undefined ? (
              <View style={[styles.count, selected && styles.countOn]}>
                <Text style={[styles.countText, selected && styles.countTextOn]}>{option.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -16, flexGrow: 0 },
  row: { gap: 8, paddingHorizontal: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: ac.containerHigh,
  },
  chipOn: { backgroundColor: ac.primary },
  label: { fontFamily: af.semibold, fontSize: 15, color: ac.textMuted },
  labelOn: { color: ac.onPrimary },
  count: { minWidth: 22, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: ac.card, alignItems: 'center', justifyContent: 'center' },
  countOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  countText: { fontFamily: af.bold, fontSize: 12, color: ac.textMuted },
  countTextOn: { color: ac.onPrimary },
});
