import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import type { VerificationStatus } from '../types/provider';

// FR2: provider verification status shown on customer-facing screens.
export default function VerifiedBadge({ status }: { status: VerificationStatus }) {
  if (status !== 'verified') return null;
  return (
    <View style={styles.badge} accessibilityLabel="Verified provider">
      <Ionicons name="shield-checkmark" size={12} color={colors.success} />
      <Text style={styles.text}>Verified</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.successSoft,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700', color: colors.success },
});
