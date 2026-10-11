import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import FormMessage from '../../components/FormMessage';
import CustomerButton from '../../components/customer/CustomerButton';
import CustomerInput from '../../components/customer/CustomerInput';
import CustomerScreen from '../../components/customer/CustomerScreen';
import { cc, cf, cr } from '../../constants/customerTheme';
import { useAuth } from '../../hooks/useAuth';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import { validateEmail, validateRequired } from '../../utils/validation';

type FieldErrors = { email?: string; password?: string };

// Login (reference: sign_in.jpeg) — the single sign-in screen for every role.
// Customers, providers and administrators enter their email and password; the
// server returns the account's role and the auth layout redirects to that
// role's home (customer home, provider dashboard or admin dashboard).
export default function CustomerLogin() {
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const nextErrors: FieldErrors = {
      email: validateEmail(email),
      password: validateRequired(password, 'Password'),
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (error) {
      setFormError(
        getFriendlyErrorMessage(error, {
          401: 'Incorrect email or password. Please try again.',
        }),
      );
      setSubmitting(false);
    }
  };

  return (
    <CustomerScreen contentStyle={styles.content}>
      {/* Top Language Toggle matching sign_in.jpeg */}
      <View style={styles.topLangRow}>
        <View style={styles.langPill}>
          <View style={styles.langActive}>
            <Text style={styles.langActiveText}>EN</Text>
          </View>
          <Ionicons name="globe-outline" size={14} color={cc.textMuted} style={{ marginHorizontal: 4 }} />
          <Text style={styles.langBars}>|||||</Text>
        </View>
      </View>

      <View style={styles.brand} accessible accessibilityLabel="FIX and CLEAN CO. Sri Lanka Home Services">
        <View style={styles.logo}>
          <MaterialCommunityIcons name="hammer-wrench" size={44} color={cc.onPrimary} />
          <View style={styles.logoBadge}>
            <Ionicons name="checkmark-sharp" size={13} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.brandName}>FIX &amp; CLEAN CO.</Text>
        <Text style={styles.brandTag}>SRI LANKA HOME SERVICES</Text>
      </View>

      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          Welcome Back 🙏
        </Text>
        <Text style={styles.subtitle}>Sign in to book plumbers &amp; electricians</Text>
      </View>

      {formError ? <FormMessage message={formError} /> : null}

      <CustomerInput
        label="Email Address"
        labelVariant="title"
        labelRight={
          <View style={styles.verifiedUserRow}>
            <Ionicons name="checkmark-circle-outline" size={14} color={cc.success} />
            <Text style={styles.verifiedUserText}>Verified User</Text>
          </View>
        }
        icon="at-outline"
        iconColor={cc.primary}
        placeholder="nadeesha.perera@email.com"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!submitting}
      />

      <CustomerInput
        ref={passwordRef}
        label="Password"
        labelVariant="title"
        labelRight={<Text style={styles.forgotPassText}>Forgot Password?</Text>}
        icon="lock-closed-outline"
        iconColor={cc.textMuted}
        placeholder="CeylonSuperSecure2024!"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
        }}
        error={errors.password}
        secureToggle
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        editable={!submitting}
      />

      {/* Metro serving info banner matching sign_in.jpeg */}
      <View style={styles.metroBanner}>
        <Ionicons name="paper-plane-outline" size={16} color={cc.primary} />
        <Text style={styles.metroText}>Auto-serving Colombo, Gampaha &amp; Kandy metro areas</Text>
      </View>

      <CustomerButton title="SIGN IN" icon="arrow-forward" large onPress={handleSubmit} loading={submitting} />

      {/* Or sign in with Google */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.googleBtn} accessibilityRole="button" accessibilityLabel="Continue with Google">
        <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
        <Text style={styles.googleBtnText}>Continue with Google</Text>
      </Pressable>

      {/* Trust card matching sign_in.jpeg */}
      <View style={styles.loginTrustCard}>
        <View style={styles.trustShieldIcon}>
          <Ionicons name="shield-checkmark" size={24} color="#00875A" />
        </View>
        <View style={styles.trustInfo}>
          <Text style={styles.trustTitle}>100% Police Verified</Text>
          <Text style={styles.trustSubtitle}>Sri Lankan Skilled Trades</Text>
        </View>
        <View style={styles.trustRating}>
          <Ionicons name="star" size={15} color="#F59E0B" />
          <Text style={styles.trustRatingText}>4.9 / 5</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.muted}>Don&apos;t have an account?</Text>
        <Link href="/auth/customer-signup" style={styles.link} accessibilityRole="link">
          Sign Up
        </Link>
      </View>

      <View style={styles.providerRow}>
        <MaterialCommunityIcons name="hammer-wrench" size={16} color={cc.textMuted} />
        <Text style={styles.providerText}>Are you a service provider?</Text>
        <Link href="/auth/provider-signup" style={styles.providerLink} accessibilityRole="link">
          Join as a pro
        </Link>
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 24, gap: 16 },
  brand: { alignItems: 'center', gap: 2, marginTop: 4 },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 20,
    backgroundColor: cc.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: cc.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: cc.amberBright,
    borderWidth: 2,
    borderColor: cc.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontFamily: cf.heading, fontSize: 20, color: cc.text, letterSpacing: 0.8 },
  brandTag: { fontFamily: cf.semibold, fontSize: 11, color: cc.primary, letterSpacing: 1.8 },
  heading: { gap: 4, marginTop: 2 },
  title: { fontFamily: cf.heading, fontSize: 26, color: cc.text, letterSpacing: -0.4 },
  subtitle: { fontFamily: cf.body, fontSize: 15, color: cc.textMuted },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  muted: { fontFamily: cf.body, fontSize: 15, color: cc.textMuted },
  link: { fontFamily: cf.bold, fontSize: 15, color: cc.primary },
  providerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  providerText: { fontFamily: cf.body, fontSize: 14, color: cc.textMuted },
  providerLink: { fontFamily: cf.semibold, fontSize: 14, color: cc.primary },
  topLangRow: { alignItems: 'flex-end', marginBottom: 4 },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderRadius: cr.full,
    padding: 3,
    paddingRight: 8,
  },
  langActive: {
    backgroundColor: cc.primary,
    borderRadius: cr.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  langActiveText: { fontFamily: cf.bold, fontSize: 11, color: '#FFFFFF' },
  langBars: { fontSize: 10, color: cc.textMuted, letterSpacing: 1 },
  inputWrap: { gap: 6 },
  labelHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontFamily: cf.semibold, fontSize: 14, color: cc.text },
  verifiedUserRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedUserText: { fontFamily: cf.medium, fontSize: 12, color: cc.success },
  forgotPassText: { fontFamily: cf.medium, fontSize: 13, color: cc.primary },
  metroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F7FF',
    borderRadius: cr.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metroText: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted, flex: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: cc.outlineSoft },
  dividerText: { fontFamily: cf.semibold, fontSize: 11, color: cc.textSubtle, letterSpacing: 0.8 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: cc.card,
    borderRadius: cr.md,
    borderWidth: 1,
    borderColor: cc.outlineSoft,
    minHeight: 48,
  },
  googleBtnText: { fontFamily: cf.semibold, fontSize: 14, color: cc.text },
  loginTrustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0F4FA',
    borderRadius: cr.lg,
    padding: 14,
    marginTop: 4,
  },
  trustShieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustInfo: { flex: 1 },
  trustTitle: { fontFamily: cf.headingSemi, fontSize: 14, color: cc.text },
  trustSubtitle: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  trustRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustRatingText: { fontFamily: cf.bold, fontSize: 13, color: cc.text },
});
