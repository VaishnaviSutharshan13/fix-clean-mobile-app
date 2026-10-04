import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import Button from '../../components/Button';
import FormMessage from '../../components/FormMessage';
import Header from '../../components/Header';
import Input from '../../components/Input';
import Screen from '../../components/Screen';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import {
  normalizePhone,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from '../../utils/validation';

type Field = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<Field, string>>;

// Password strength hint shown under the password field (as in the prototype).
function getStrength(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { level: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score++;
  if (password.length >= 12 || /[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Weak', 'Weak', 'Good', 'Strong'] as const;
  return { level: score as 0 | 1 | 2 | 3, label: labels[score]! };
}

// Customer Sign Up (Milestone 02, Variant A): all registration details in one
// structured form. There is no role selector — the server assigns "customer".
export default function CustomerSignup() {
  const { registerCustomer } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: Field) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validate = (): FieldErrors => ({
    name: validateName(values.name),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    password: validatePassword(values.password),
    confirmPassword: !values.confirmPassword
      ? 'Please confirm your password'
      : values.confirmPassword !== values.password
        ? 'Passwords do not match'
        : undefined,
  });

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await registerCustomer({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: normalizePhone(values.phone),
        password: values.password,
      });
      // The auth layout redirects the new customer to /customer/home.
    } catch (error) {
      setFormError(
        getFriendlyErrorMessage(error, {
          409: 'An account with this email already exists. Try signing in instead.',
        }),
      );
      setSubmitting(false);
    }
  };

  const strength = getStrength(values.password);
  const strengthColor = [colors.border, colors.danger, colors.warning, colors.success][strength.level];

  return (
    <Screen
      header={
        <Header
          title="Create Account"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/auth/customer-login'))}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={typography.title}>Personal details</Text>
        <Text style={styles.subtitle}>Fill in all fields to start booking home repair and cleaning services.</Text>
      </View>

      {formError ? <FormMessage message={formError} /> : null}

      <View style={styles.card}>
        <Input
          label="Full name"
          icon="person-outline"
          placeholder="e.g. Nadeesha Perera"
          value={values.name}
          onChangeText={setField('name')}
          error={errors.name}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!submitting}
        />
        <Input
          ref={emailRef}
          label="Email address"
          icon="mail-outline"
          placeholder="you@example.com"
          value={values.email}
          onChangeText={setField('email')}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          editable={!submitting}
        />
        <Input
          ref={phoneRef}
          label="Phone number"
          icon="call-outline"
          placeholder="e.g. 0771234567"
          value={values.phone}
          onChangeText={setField('phone')}
          error={errors.phone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!submitting}
        />
        <View style={styles.passwordGroup}>
          <Input
            ref={passwordRef}
            label="Password"
            icon="lock-closed-outline"
            placeholder="At least 8 characters"
            value={values.password}
            onChangeText={setField('password')}
            error={errors.password}
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            editable={!submitting}
          />
          {values.password ? (
            <View style={styles.strengthRow} accessibilityLabel={`Password strength: ${strength.label}`}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={[styles.strengthBar, { backgroundColor: step <= strength.level ? strengthColor : colors.border }]}
                />
              ))}
              <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strength.label}</Text>
            </View>
          ) : (
            <Text style={styles.hint}>8–72 characters, with at least one letter and one number.</Text>
          )}
        </View>
        <Input
          ref={confirmRef}
          label="Confirm password"
          icon="lock-closed-outline"
          placeholder="Re-enter your password"
          value={values.confirmPassword}
          onChangeText={setField('confirmPassword')}
          error={errors.confirmPassword}
          secureToggle
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!submitting}
        />
      </View>

      <Button title="CREATE ACCOUNT" icon="arrow-forward" onPress={handleSubmit} loading={submitting} />

      <View style={styles.footerRow}>
        <Text style={styles.muted}>Already registered?</Text>
        <Link href="/auth/customer-login" style={styles.link} accessibilityRole="link">
          Login
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  passwordGroup: { gap: spacing.sm },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '700', marginLeft: spacing.xs, minWidth: 48, textAlign: 'right' },
  hint: { fontSize: 12, color: colors.textMuted },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingBottom: spacing.lg },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
