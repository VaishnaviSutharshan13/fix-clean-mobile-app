import { StyleSheet, Text, View } from 'react-native';

import { ac, af } from '../../constants/adminTheme';
import type { TimelineEntry } from '../../types/admin';
import { ROLE_META, type PillMeta } from '../../utils/admin';
import { formatDateTime } from '../../utils/dates';

// Status history with who made each change (customer, provider or admin).
export default function Timeline<S extends string>({ entries, meta }: { entries: TimelineEntry<S>[]; meta: Record<S, PillMeta> }) {
  return (
    <View>
      {entries.map((entry, index) => {
        const m = meta[entry.status];
        const last = index === entries.length - 1;
        return (
          <View key={`${entry.status}-${entry.changedAt}`} style={styles.item}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: m.fg }]} />
              {!last ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.body}>
              <Text style={styles.status}>{m.label}</Text>
              <Text style={styles.meta}>
                {formatDateTime(entry.changedAt)}
                {entry.by ? ` • ${entry.by.name} (${ROLE_META[entry.by.role].label})` : ''}
              </Text>
              {entry.note ? <Text style={styles.note}>“{entry.note}”</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: ac.containerHigh, marginVertical: 2 },
  body: { flex: 1, minWidth: 0, paddingBottom: 14, gap: 2 },
  status: { fontFamily: af.bold, fontSize: 14, color: ac.text },
  meta: { fontFamily: af.body, fontSize: 12, color: ac.textMuted },
  note: { fontFamily: af.body, fontSize: 13, color: ac.text, fontStyle: 'italic' },
});
