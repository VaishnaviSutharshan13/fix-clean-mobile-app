import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import FormMessage from '../../components/FormMessage';
import ProviderBrand from '../../components/provider/ProviderBrand';
import Screen from '../../components/Screen';
import { colors, radius, spacing } from '../../constants/theme';
import { RoleMismatchError } from '../../context/AuthContext';
import { useAuth } from '../../hooks/useAuth';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import { validateEmail, validateRequired } from '../../utils/validation';

type FieldErrors = { email?: string; password?: string };

// Provider Login (Milestone 02 Variant A / Figma frame "Provider Login").
// Only provider accounts may sign in here; on success the auth layout
// redirects to /provider/dashboard.
export default function ProviderLogin() {
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const next: FieldErrors = {
      email: validateEmail(email),
      password: validateRequired(password, 'Password'),
    };
    setErrors(next);
    setFormError(undefined);
    if (next.email || next.password) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password }, { expectedRole: 'provider' });
    } catch (error) {
      setFormError(
        error instanceof RoleMismatchError
          ? error.actualRole === 'customer'
            ? 'This is a customer account. Please use the Customer login instead.'
            : 'This account cannot sign in to the provider portal.'
          : getFriendlyErrorMessage(error, { 401: 'Incorrect email or password. Please try again.' }),
      );
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ProviderBrand />

      <View style={styles.portalRow}>
        <View style={styles.portalChip}>
          <View style={styles.portalDot} />
          <Text style={styles.portalText}>OPERATIONS PORTAL</Text>
        </View>
      </View>

      <View style={styles.welcome}>
        <View style={styles.welcomeIcon}>
          <Ionicons name="construct-outline" size={30} color={colors.primary} />
        </View>
        <View style={styles.welcomeText}>
          <View style={styles.tag}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.primary} />
            <Text style={styles.tagText}>SERVICE PROVIDER</Text>
          </View>
          <Text style={styles.welcomeTitle}>Welcome Back, Specialist</Text>
          <Text style={styles.welcomeSub}>Manage your booking requests and jobs.</Text>
        </View>
      </View>

      <View style={styles.card}>
        {formError ? <FormMessage message={formError} /> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputRow, !!errors.email && styles.inputError]}>
            <Ionicons name="id-card-outline" size={19} color={colors.textMuted} />
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!submitting}
              accessibilityLabel="Email address"
            />
          </View>
          {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputRow, !!errors.password && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={19} color={colors.textMuted} />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              editable={!submitting}
              accessibilityLabel="Password"
            />
            <Pressable
              style={styles.showPill}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={14} color={colors.textMuted} />
              <Text style={styles.showText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
            </Pressable>
          </View>
          {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
        </View>

        <Pressable
          style={({ pressed }) => [styles.signIn, (pressed || submitting) && { opacity: 0.85 }]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Sign in as pro"
          accessibilityState={{ busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.signInText}>SIGN IN AS PRO</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </>
          )}
        </Pressable>

        <View style={styles.newRow}>
          <Text style={styles.muted}>New service provider? </Text>
          <Link href="/auth/provider-signup" style={styles.link} accessibilityRole="link">
            Create Provider Account
          </Link>
        </View>
      </View>

      <View style={styles.desk}>
        <View style={styles.deskIcon}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.deskText}>
          <Text style={styles.deskTitle}>Provider Verification</Text>
          <Text style={styles.deskBody}>
            New provider accounts are reviewed by FIX & CLEAN CO. administrators (identity, contact and experience)
            before customers can book you.
          </Text>
        </View>
      </View>

      <View style={styles.customerRow}>
        <Text style={styles.muted}>Looking for a service? </Text>
        <Link href="/auth/customer-login" style={styles.link} accessibilityRole="link">
          Customer login
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  portalRow: { flexDirection: 'row' },
  portalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lavenderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  portalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.dutyText },
  portalText: { fontSize: 12, fontWeight: '700', color: colors.text, letterSpacing: 0.3 },
  welcome: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: { flex: 1, gap: 4 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.lavenderStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  welcomeTitle: { fontSize: 22, fontWeight: '600', color: colors.text, lineHeight: 28 },
  welcomeSub: { fontSize: 12, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.lavender,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.lavender,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.text, paddingVertical: spacing.sm },
  showPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lavenderStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  showText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  error: { fontSize: 12, color: colors.danger },
  signIn: {
    minHeight: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.slate,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  signInText: { fontSize: 18, fontWeight: '500', color: colors.white, letterSpacing: 0.2 },
  newRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  muted: { fontSize: 14, color: colors.textMuted },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  desk: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.lavenderStrong,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  deskIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deskText: { flex: 1, gap: 4 },
  deskTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  deskBody: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  customerRow: { flexDirection: 'row', justifyContent: 'center', paddingBottom: spacing.lg },
});
