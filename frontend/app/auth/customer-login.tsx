import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import BrandMark from '../../components/BrandMark';
import Button from '../../components/Button';
import FormMessage from '../../components/FormMessage';
import Input from '../../components/Input';
import Screen from '../../components/Screen';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import { validateEmail, validateRequired } from '../../utils/validation';

type FieldErrors = { email?: string; password?: string };

// Customer Login (Milestone 02, Variant A): email/password with a clear primary
// Sign In action and a path to Sign Up. On success the auth layout redirects to
// the role's home screen (/customer/home for customers).
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
      // Navigation happens in app/auth/_layout.tsx once the user is set.
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
    <Screen>
      <View style={styles.card}>
        <BrandMark />

        <View style={styles.heading}>
          <Text style={typography.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to book plumbers, electricians and cleaners.</Text>
        </View>

        {formError ? <FormMessage message={formError} /> : null}

        <Input
          label="Email address"
          icon="mail-outline"
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

        <Input
          ref={passwordRef}
          label="Password"
          icon="lock-closed-outline"
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

        <Button title="SIGN IN" icon="arrow-forward" onPress={handleSubmit} loading={submitting} />

        <View style={styles.footerRow}>
          <Text style={styles.muted}>Don&apos;t have an account?</Text>
          <Link href="/auth/customer-signup" style={styles.link} accessibilityRole="link">
            Sign Up
          </Link>
        </View>
      </View>

      <View style={styles.otherRoles}>
        <Text style={styles.muted}>Are you a service provider?</Text>
        <Link href="/auth/provider-login" style={styles.link} accessibilityRole="link">
          Provider sign in
        </Link>
        <Link href="/auth/admin-login" style={[styles.link, styles.adminLink]} accessibilityRole="link">
          Administrator sign in
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  heading: { gap: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  otherRoles: { alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.lg },
  adminLink: { fontWeight: '500', fontSize: 13 },
});
