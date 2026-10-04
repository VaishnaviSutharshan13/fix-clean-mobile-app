import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';

type Props = { value: number; count?: number; size?: number };

// "★ 4.7 (32 reviews)" — FR1. Shows "New" when a provider has no reviews yet.
export default function Rating({ value, count, size = 14 }: Props) {
  const hasReviews = count === undefined || count > 0;
  return (
    <View
      style={styles.row}
      accessibilityLabel={hasReviews ? `Rated ${value} out of 5${count !== undefined ? ` from ${count} reviews` : ''}` : 'No reviews yet'}
    >
      <Ionicons name="star" size={size} color={colors.star} />
      {hasReviews ? (
        <>
          <Text style={[styles.value, { fontSize: size }]}>{value.toFixed(1)}</Text>
          {count !== undefined ? (
            <Text style={[styles.count, { fontSize: size - 2 }]}>
              ({count} {count === 1 ? 'review' : 'reviews'})
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={[styles.count, { fontSize: size - 2 }]}>New · no reviews yet</Text>
      )}
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? 'star' : 'star-outline'} size={size} color={colors.star} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  value: { fontWeight: '700', color: colors.text },
  count: { color: colors.textMuted },
});
