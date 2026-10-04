import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import type { ProviderAccount } from '../../types/provider';

// FR2: tells the provider their verification state. Unverified providers can
// use the portal but are not shown to customers until an administrator approves.
export default function VerificationBanner({ account }: { account: ProviderAccount }) {
  if (account.verificationStatus === 'verified') return null;
  const rejected = account.verificationStatus === 'rejected';
  return (
    <View
      style={[styles.banner, rejected ? styles.rejected : styles.pending]}
      accessibilityRole="summary"
      testID="verification-banner"
    >
      <Ionicons
        name={rejected ? 'close-circle-outline' : 'hourglass-outline'}
        size={22}
        color={rejected ? colors.danger : colors.warning}
      />
      <View style={styles.text}>
        <Text style={[styles.title, { color: rejected ? colors.danger : colors.warning }]}>
          {rejected ? 'Verification not approved' : 'Verification pending'}
        </Text>
        <Text style={styles.body}>
          {rejected
            ? 'Your provider application was not approved, so customers cannot book you. Please contact FIX & CLEAN CO. support.'
            : 'An administrator will check your identity, contact, experience and the services & rates you list. Customers can find and book you once you are verified.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  pending: { backgroundColor: colors.warningSoft, borderColor: '#F3D49A' },
  rejected: { backgroundColor: colors.dangerSoft, borderColor: '#F3B8B8' },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 18, color: colors.text },
});
