import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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
        <Text style={styles.subtitle}>Sign in to your Fix &amp; Clean account</Text>
      </View>

      {formError ? <FormMessage message={formError} /> : null}

      <CustomerInput
        label="Email Address"
        labelVariant="title"
        icon="mail-outline"
        iconColor={cc.textMuted}
        placeholder="you@example.com"
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
        icon="lock-closed-outline"
        iconColor={cc.textMuted}
        placeholder="Enter your password"
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

      <CustomerButton title="SIGN IN" icon="arrow-forward" large onPress={handleSubmit} loading={submitting} />

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
});
