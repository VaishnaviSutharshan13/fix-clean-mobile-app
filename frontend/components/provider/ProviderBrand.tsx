import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../../constants/theme';

// Logo block from the Provider Login / Sign Up frames.
export default function ProviderBrand() {
  return (
    <View style={styles.wrap} accessible accessibilityLabel="FIX and CLEAN CO. Sri Lanka Pro Network">
      <View style={styles.logo}>
        <Ionicons name="construct" size={26} color={colors.white} />
      </View>
      <Text style={styles.name}>FIX & CLEAN CO.</Text>
      <Text style={styles.tag}>SRI LANKA PRO NETWORK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  name: { fontSize: 19, fontWeight: '600', color: colors.primary, letterSpacing: -0.3 },
  tag: { fontSize: 12, fontWeight: '500', color: colors.textMuted, letterSpacing: 0.6 },
});
