import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

// FIX & CLEAN CO. logo block used on the auth screens.
export default function BrandMark() {
  return (
    <View style={styles.container} accessible accessibilityLabel="FIX and CLEAN CO. Sri Lanka Home Services">
      <View style={styles.logo}>
        <Ionicons name="construct" size={34} color={colors.white} />
      </View>
      <Text style={styles.name}>FIX & CLEAN CO.</Text>
      <Text style={styles.tagline}>SRI LANKA HOME SERVICES</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xs },
  logo: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  name: { fontSize: 18, fontWeight: '800', color: colors.navy, letterSpacing: 0.5 },
  tagline: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.2 },
});
