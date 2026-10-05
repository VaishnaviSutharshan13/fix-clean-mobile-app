import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormMessage from '../../components/FormMessage';
import { ac, af, ar, cardShadow } from '../../constants/adminTheme';
import { config } from '../../constants/config';
import { RoleMismatchError } from '../../context/AuthContext';
import { useAuth } from '../../hooks/useAuth';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import { validateEmail, validateRequired } from '../../utils/validation';

type FieldErrors = { email?: string; password?: string };
type ServerState = 'checking' | 'online' | 'offline';

const apiHost = config.apiBaseUrl.replace(/^https?:\/\//, '');

// Real reachability check for the status pill: any HTTP response (even 401)
// means the API is up; a network failure means it is offline.
function useServerState(): ServerState {
  const [state, setState] = useState<ServerState>('checking');
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetch(`${config.apiBaseUrl}/auth/profile`)
        .then(() => !cancelled && setState('online'))
        .catch(() => !cancelled && setState('offline'));
    void check();
    const timer = setInterval(check, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return state;
}

// Admin Login — Admin Figma frame 1:1360 ("Terminal Login"). Uses the shared
// login API; only "admin" accounts may continue (customer/provider accounts
// are refused, no session stored). There is no sign-up path: admin accounts
// can't be created through public registration. On success the auth layout
// redirects to /admin/dashboard.
export default function AdminLogin() {
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const server = useServerState();

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
      await login({ email: email.trim(), password }, { expectedRole: 'admin' });
    } catch (error) {
      setFormError(
        error instanceof RoleMismatchError
          ? error.actualRole === 'provider'
            ? 'This is a service provider account. Please use Provider Login instead.'
            : 'This is a customer account. Please use Customer Login instead.'
          : getFriendlyErrorMessage(error, { 401: 'Incorrect email or password. Please try again.' }),
      );
      setSubmitting(false);
    }
  };

  const serverMeta = {
    checking: { label: 'Checking…', bg: ac.containerHigh, fg: ac.textMuted },
    online: { label: 'Server Online', bg: ac.successSoft, fg: ac.success },
    offline: { label: 'Server Offline', bg: ac.errorContainer, fg: ac.error },
  }[server];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.securePill}>
          <Ionicons name="shield-half-outline" size={16} color={ac.success} />
          <Text style={styles.secureText}>Secure Admin Access</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Brand card */}
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons name="construct" size={20} color={ac.onPrimary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.brandName}>FIX &amp; CLEAN CO.</Text>
              <Text style={styles.brandPortal}>[ADMIN PORTAL]</Text>
            </View>
            <View style={[styles.hubPill, { backgroundColor: serverMeta.bg }]} accessibilityLabel={serverMeta.label}>
              <View style={[styles.hubDot, { backgroundColor: serverMeta.fg }]} />
              <Text style={[styles.hubText, { color: serverMeta.fg }]}>{serverMeta.label}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.opsTitle}>Operations &amp; Field Management</Text>
            <View style={styles.inline}>
              <Ionicons name="location-outline" size={15} color={ac.tertiary} />
              <Text style={styles.opsSub}>Sri Lanka • Home Services Platform</Text>
            </View>
          </View>
          <View style={styles.protoWell}>
            <Ionicons name="shield-checkmark-outline" size={16} color={ac.primary} />
            <Text style={styles.protoText}>ADMIN ROLE REQUIRED</Text>
            <Text style={styles.protoText}>TOKEN-SECURED SESSION</Text>
          </View>
        </View>

        {/* Terminal Login */}
        <View style={styles.card}>
          <View style={styles.loginHead}>
            <View style={styles.loginDot} />
            <Text style={styles.loginTitle}>Terminal Login</Text>
            <View style={styles.secChip}>
              <Text style={styles.secChipText}>SEC-PORTAL</Text>
            </View>
          </View>

          {formError ? <FormMessage message={formError} /> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Work Email</Text>
            <View style={[styles.inputRow, !!errors.email && styles.inputError]}>
              <Ionicons name="id-card-outline" size={22} color={ac.textMuted} />
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                placeholder="admin@example.com"
                placeholderTextColor={ac.outline}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!submitting}
                accessibilityLabel="Admin email"
              />
            </View>
            {errors.email ? (
              <Text style={styles.error}>{errors.email}</Text>
            ) : (
              <View style={styles.inline}>
                <Ionicons name="options-outline" size={14} color={ac.success} />
                <Text style={styles.hint}>Use the email of your administrator account</Text>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Security Password</Text>
              <View style={styles.authChip}>
                <Text style={styles.authChipText}>ADMIN ONLY</Text>
              </View>
            </View>
            <View style={[styles.inputRow, !!errors.password && styles.inputError]}>
              <Ionicons name="key-outline" size={22} color={ac.textMuted} />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                placeholder="Enter your password"
                placeholderTextColor={ac.outline}
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
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={15} color={ac.textMuted} />
                <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.signIn, (pressed || submitting) && { opacity: 0.88 }]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Sign in as administrator"
            accessibilityState={{ busy: submitting }}
          >
            {submitting ? (
              <ActivityIndicator color={ac.onPrimary} />
            ) : (
              <>
                <Text style={styles.signInText}>SIGN IN AS ADMIN</Text>
                <Ionicons name="arrow-forward" size={20} color={ac.onPrimary} />
              </>
            )}
          </Pressable>

          <View style={styles.gateway}>
            <View style={[styles.gatewayDot, { backgroundColor: serverMeta.fg }]} />
            <Text style={styles.gatewayText} numberOfLines={2}>
              API: {apiHost}
            </Text>
            <Text style={[styles.gatewayStatus, { color: serverMeta.fg }]}>{server.toUpperCase()}</Text>
          </View>
        </View>

        {/* Authorized personnel */}
        <View style={styles.authCard}>
          <View style={styles.authRow}>
            <View style={styles.authIcon}>
              <Ionicons name="shield-outline" size={20} color={ac.tertiary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.authTitle}>Authorized Personnel Only</Text>
              <View style={styles.auditPill}>
                <Text style={styles.auditText}>Admin Role Required</Text>
              </View>
              <Text style={styles.authBody}>
                Only administrator accounts can sign in. Customer and provider accounts are refused, and admin accounts
                can&apos;t be created from the app.
              </Text>
            </View>
          </View>
          <View style={styles.refRow}>
            <Text style={styles.refText}>ACCESS: ADMIN ROLE</Text>
            <Text style={styles.refRestricted}>RESTRICTED ACCESS</Text>
          </View>
        </View>

        <View style={styles.footerLinks}>
          <Link href="/auth/customer-login" style={styles.footerLink} accessibilityRole="link">
            Customer Login
          </Link>
          <View style={styles.footerDot} />
          <Link href="/auth/provider-login" style={styles.footerLink} accessibilityRole="link">
            Provider Login
          </Link>
        </View>
        <Text style={styles.copyright}>© 2026 FIX &amp; CLEAN CO. OPERATIONAL CONTROL HUB</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ac.surface },
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: ac.surface,
    shadowColor: '#131B2E',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 2,
  },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ac.containerLow,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: ar.full,
  },
  secureText: { fontFamily: af.medium, fontSize: 14, color: ac.text },
  content: { padding: 16, gap: 24, paddingBottom: 32 },
  card: { backgroundColor: ac.card, borderRadius: ar.lg + 2, padding: 16, gap: 16, ...cardShadow },
  brandRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  logo: { width: 32, height: 32, borderRadius: 8, backgroundColor: ac.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  brandName: { fontFamily: af.heading, fontSize: 20, color: ac.text, letterSpacing: -0.6 },
  brandPortal: { fontFamily: af.semibold, fontSize: 13, color: ac.primary, letterSpacing: 0.8 },
  hubPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: ar.full, marginTop: 2 },
  hubDot: { width: 6, height: 6, borderRadius: 3 },
  hubText: { fontFamily: af.semibold, fontSize: 12 },
  opsTitle: { fontFamily: af.medium, fontSize: 15, color: ac.text, marginBottom: 2 },
  opsSub: { fontFamily: af.body, fontSize: 12, color: ac.textMuted, flexShrink: 1 },
  protoWell: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ac.containerLow,
    borderRadius: ar.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  protoText: { fontFamily: af.medium, fontSize: 12, color: ac.textMuted, letterSpacing: 0.4 },
  loginHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ac.tertiary },
  loginTitle: { flex: 1, fontFamily: af.heading, fontSize: 20, color: ac.text, letterSpacing: -0.5 },
  secChip: { backgroundColor: ac.containerHigh, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  secChipText: { fontFamily: af.semibold, fontSize: 11, color: ac.textMuted, letterSpacing: 0.8 },
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: af.semibold, fontSize: 14, color: ac.text },
  authChip: { backgroundColor: ac.tertiaryContainer, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  authChipText: { fontFamily: af.bold, fontSize: 11, color: ac.onTertiaryContainer, letterSpacing: 0.6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ac.containerLow,
    borderRadius: ar.md,
    paddingHorizontal: 12,
    minHeight: 50,
    borderWidth: 1,
    borderColor: ac.containerLow,
  },
  inputError: { borderColor: ac.error },
  input: { outlineWidth: 0, outlineStyle: 'solid', flex: 1, minWidth: 0, fontFamily: af.body, fontSize: 16, color: ac.text, paddingVertical: 10 },
  showPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ac.containerHigh,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: ar.sm,
  },
  showText: { fontFamily: af.semibold, fontSize: 13, color: ac.textMuted },
  hint: { fontFamily: af.body, fontSize: 12, color: ac.textMuted, flexShrink: 1 },
  error: { fontFamily: af.medium, fontSize: 12, color: ac.error },
  signIn: {
    minHeight: 52,
    borderRadius: ar.md,
    backgroundColor: ac.dark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#131B2E',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  signInText: { fontFamily: af.bold, fontSize: 17, color: ac.onPrimary, letterSpacing: 0.3 },
  gateway: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ac.containerLow,
    borderRadius: ar.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  gatewayDot: { width: 8, height: 8, borderRadius: 2 },
  gatewayText: { flex: 1, fontFamily: af.monoBold, fontSize: 12, color: ac.text },
  gatewayStatus: { fontFamily: af.monoBold, fontSize: 12 },
  authCard: { backgroundColor: ac.containerHigh, borderRadius: ar.lg + 2, padding: 16, gap: 12 },
  authRow: { flexDirection: 'row', gap: 12 },
  authIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0DCCB', alignItems: 'center', justifyContent: 'center' },
  authTitle: { fontFamily: af.semibold, fontSize: 16, color: ac.text },
  auditPill: { alignSelf: 'flex-start', backgroundColor: ac.errorContainer, borderRadius: ar.full, paddingHorizontal: 9, paddingVertical: 2, marginVertical: 6 },
  auditText: { fontFamily: af.semibold, fontSize: 13, color: ac.onErrorContainer },
  authBody: { fontFamily: af.body, fontSize: 14, lineHeight: 19, color: ac.textMuted },
  refRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: ac.surface,
    borderRadius: ar.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refText: { fontFamily: af.monoBold, fontSize: 12, color: ac.textMuted },
  refRestricted: { fontFamily: af.bold, fontSize: 12, color: ac.error, letterSpacing: 0.6 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12 },
  footerLink: { fontFamily: af.body, fontSize: 14, color: ac.textMuted },
  footerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: ac.outlineVariant },
  copyright: { fontFamily: af.monoBold, fontSize: 11, color: ac.textMuted, textAlign: 'center', letterSpacing: 0.3 },
});
