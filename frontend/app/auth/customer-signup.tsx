import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import FormMessage from '../../components/FormMessage';
import CustomerButton from '../../components/customer/CustomerButton';
import CustomerInput, { FieldStatus } from '../../components/customer/CustomerInput';
import CustomerScreen from '../../components/customer/CustomerScreen';
import { cc, cf, cr, GUTTER } from '../../constants/customerTheme';
import { useAuth } from '../../hooks/useAuth';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import { getPasswordStrength } from '../../utils/passwordStrength';
import {
  normalizePhone,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from '../../utils/validation';

type Field = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<Field | 'consent', string>>;

const STRENGTH_COLORS = [cc.outlineSoft, cc.danger, cc.amberBright, cc.primaryBright, cc.success];

// Customer Sign Up (reference: create_account.jpeg): personal details with
// "Valid" indicators (format checks on this device — email availability and
// phone ownership are not verified), password strength, consent, COMPLETE
// SIGN UP. The server assigns the "customer" role.
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
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: Field) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  // The field shows a +94 prefix, so a local number typed without its leading
  // 0 (e.g. 771234567) is sent as 0771234567. Full numbers are kept as typed.
  const phoneValue = (() => {
    const compact = normalizePhone(values.phone);
    return /^[1-9]\d{8}$/.test(compact) ? `0${compact}` : compact;
  })();

  const validate = (): FieldErrors => ({
    name: validateName(values.name),
    email: validateEmail(values.email),
    phone: validatePhone(phoneValue),
    password: validatePassword(values.password),
    confirmPassword: !values.confirmPassword
      ? 'Please confirm your password'
      : values.confirmPassword !== values.password
        ? 'Passwords do not match'
        : undefined,
    consent: consent ? undefined : 'Please confirm to continue',
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
        phone: phoneValue,
        password: values.password,
      });
    } catch (error) {
      setFormError(
        getFriendlyErrorMessage(error, {
          409: 'An account with this email already exists. Try signing in instead.',
        }),
      );
      setSubmitting(false);
    }
  };

  // "Valid" only when the value passes the same checks used on submit.
  const isNameValid = !!values.name.trim() && !validateName(values.name);
  const isEmailValid = !!values.email && !validateEmail(values.email);
  const isPhoneValid = !!values.phone && !validatePhone(phoneValue);

  const strength = getPasswordStrength(values.password);
  const strengthColor = STRENGTH_COLORS[strength.level];
  const displayStrengthLevel = strength.level;
  const displayStrengthLabel = strength.label;

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/auth/customer-login'))}
        style={styles.back}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={24} color={cc.primary} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text style={styles.headerTitle} accessibilityRole="header">
        Create Account
      </Text>
    </View>
  );

  return (
    <CustomerScreen header={header} contentStyle={styles.content}>
      {/* Badge at top */}
      <View style={styles.badge}>
        <Ionicons name="shield-checkmark-outline" size={14} color={cc.primary} />
        <Text style={styles.badgeText}>Sri Lanka&apos;s Trusted Home Network</Text>
      </View>

      {/* Intro */}
      <View style={styles.intro}>
        <Text style={styles.title}>Personal Details</Text>
        <Text style={styles.subtitle}>Fill all fields to book home repair &amp; cleaning pros.</Text>
      </View>

      {formError ? <FormMessage message={formError} /> : null}

      {/* FULL NAME */}
      <CustomerInput
        label="Full Name"
        labelVariant="upper"
        labelRight={isNameValid ? <FieldStatus label="Valid" /> : null}
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

      {/* EMAIL ADDRESS */}
      <CustomerInput
        ref={emailRef}
        label="Email Address"
        labelVariant="upper"
        labelRight={isEmailValid ? <FieldStatus label="Valid" /> : null}
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

      {/* PHONE NUMBER with [LK] +94 prefix */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.labelUpper}>PHONE NUMBER</Text>
          {isPhoneValid ? <FieldStatus label="Valid" /> : null}
        </View>
        <View style={[styles.phoneField, !!errors.phone && styles.fieldError]}>
          <View style={styles.lkPrefix}>
            <View style={styles.lkBadge}>
              <Text style={styles.lkText}>LK</Text>
            </View>
            <Text style={styles.dialCode}>+94</Text>
          </View>
          <TextInput
            ref={phoneRef}
            placeholder="77 123 4567"
            accessibilityLabel="Phone number"
            placeholderTextColor={cc.textSubtle}
            value={values.phone}
            onChangeText={setField('phone')}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!submitting}
            style={styles.phoneInput}
          />
        </View>
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
      </View>

      {/* PASSWORD with 4 strength bars */}
      <View style={styles.passwordGroup}>
        <CustomerInput
          ref={passwordRef}
          label="Password"
          labelVariant="upper"
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
        <View style={styles.strengthRow} accessibilityLabel={`Password strength: ${displayStrengthLabel}`}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                styles.strengthBar,
                {
                  backgroundColor:
                    step <= (values.password ? displayStrengthLevel : 0)
                      ? strengthColor
                      : cc.containerHigh,
                },
              ]}
            />
          ))}
          <Text style={[styles.strengthLabel, { color: strengthColor }]}>
            {values.password ? displayStrengthLabel : ''}
          </Text>
        </View>
      </View>

      {/* CONFIRM PASSWORD */}
      <CustomerInput
        ref={confirmRef}
        label="Confirm Password"
        labelVariant="upper"
        icon="shield-outline"
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

      {/* Consent (reference: terms agreement) stating the app's real privacy rule */}
      <View>
        <Pressable
          onPress={() => {
            setConsent((c) => !c);
            if (errors.consent) setErrors((e) => ({ ...e, consent: undefined }));
          }}
          style={styles.consentRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          accessibilityLabel="I confirm my details are correct and understand my address and phone number are shared with a provider only after they confirm a booking"
        >
          <View style={[styles.checkbox, consent && styles.checkboxOn]}>
            {consent ? <Ionicons name="checkmark" size={16} color={cc.onPrimary} /> : null}
          </View>
          <Text style={styles.consentText}>
            I confirm my details are correct. My address &amp; phone are shared with a provider{' '}
            <Text style={styles.consentLink}>only after they confirm</Text> a booking.
          </Text>
        </Pressable>
        {errors.consent ? <Text style={styles.errorText}>{errors.consent}</Text> : null}
      </View>

      {/* Complete sign up CTA */}
      <CustomerButton
        title="COMPLETE SIGN UP"
        icon="arrow-forward"
        variant="bright"
        large
        onPress={handleSubmit}
        loading={submitting}
        style={styles.cta}
      />

      {/* Trust row */}
      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Ionicons name="checkmark-circle-outline" size={16} color={cc.success} />
          <Text style={styles.trustText}>Verified Pros</Text>
        </View>
        <View style={styles.trustDot} />
        <View style={styles.trustItem}>
          <Ionicons name="cash-outline" size={16} color={cc.amberBright} />
          <Text style={styles.trustText}>Cash on Service</Text>
        </View>
      </View>

      {/* Login link */}
      <View style={styles.footerRow}>
        <Text style={styles.muted}>Already registered?</Text>
        <Link href="/auth/customer-login" style={styles.link} accessibilityRole="link">
          Login
        </Link>
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GUTTER,
    paddingVertical: 12,
    backgroundColor: cc.bg,
  },
  back: { position: 'absolute', left: GUTTER - 6, flexDirection: 'row', alignItems: 'center', minHeight: 40, zIndex: 1 },
  backText: { fontFamily: cf.medium, fontSize: 17, color: cc.primary },
  headerTitle: { fontFamily: cf.heading, fontSize: 19, color: cc.text },
  content: { gap: 16, paddingTop: 6, paddingBottom: 28 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: cc.primaryFixed,
    borderRadius: cr.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: { fontFamily: cf.semibold, fontSize: 13, color: cc.primary },
  intro: { gap: 4, marginTop: -2 },
  title: { fontFamily: cf.headingExtra, fontSize: 28, color: cc.text, letterSpacing: -0.6 },
  subtitle: { fontFamily: cf.body, fontSize: 14, color: cc.textMuted },
  inputGroup: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  labelUpper: { fontFamily: cf.semibold, fontSize: 14, color: cc.text, letterSpacing: 0.4 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: cc.liveGreen,
    borderRadius: cr.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  verifiedBadgeText: { fontFamily: cf.semibold, fontSize: 11, color: '#FFFFFF' },
  phoneField: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: cc.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: cc.card,
    shadowColor: cc.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  fieldError: { borderColor: cc.danger },
  lkPrefix: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lkBadge: {
    borderWidth: 1,
    borderColor: cc.outline,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  lkText: { fontFamily: cf.bold, fontSize: 11, color: cc.text },
  dialCode: { fontFamily: cf.semibold, fontSize: 15, color: cc.text },
  phoneInput: { flex: 1, fontFamily: cf.body, fontSize: 16, color: cc.text, paddingVertical: 10 },
  errorText: { fontFamily: cf.medium, fontSize: 12, color: cc.danger, marginTop: 4 },
  passwordGroup: { gap: 8 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 2 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontFamily: cf.semibold, fontSize: 13, minWidth: 50, textAlign: 'right' },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: cc.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: cc.primary },
  consentText: { flex: 1, fontFamily: cf.body, fontSize: 13, lineHeight: 19, color: cc.text },
  consentLink: { fontFamily: cf.semibold, color: cc.primary, textDecorationLine: 'underline' },
  cta: { marginTop: 4 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 2 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontFamily: cf.semibold, fontSize: 13, color: cc.textMuted },
  trustDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: cc.outline },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 },
  muted: { fontFamily: cf.body, fontSize: 15, color: cc.textMuted },
  link: { fontFamily: cf.bold, fontSize: 15, color: cc.primary },
});
