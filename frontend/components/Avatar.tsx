import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { getInitials } from '../utils/helpers';

// Initials avatar (profile photos are not stored yet).
export default function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.primary, fontWeight: '800' },
});
