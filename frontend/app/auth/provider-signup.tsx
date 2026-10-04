import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Button from '../../components/Button';
import Chip from '../../components/Chip';
import FormMessage from '../../components/FormMessage';
import ProviderBrand from '../../components/provider/ProviderBrand';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
import { EXPERIENCE_OPTIONS, SRI_LANKA_DISTRICTS } from '../../constants/sriLanka';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import type { ServiceCategory } from '../../types/provider';
import { CATEGORIES, CATEGORY_META } from '../../utils/display';
import { getFriendlyErrorMessage } from '../../utils/helpers';
import { validateEmail, validateName, validatePassword, validatePhone } from '../../utils/validation';

type Field =
  | 'name'
  | 'mobile'
  | 'email'
  | 'category'
  | 'district'
  | 'experience'
  | 'password'
  | 'confirm'
  | 'certify';
type Errors = Partial<Record<Field, string>>;

const DISTRICT_OPTIONS = SRI_LANKA_DISTRICTS.map((d) => ({ label: d, value: d }));

// "77 123 4567" (after the +94 prefix) → "+94771234567"
function toFullNumber(local: string): string {
  const digits = local.replace(/\D/g, '').replace(/^0/, '');
  return `+94${digits}`;
}

// Provider Sign Up (Milestone 02 Variant A / Figma "Create Provider Account").
// Creates a provider account plus its profile, which starts as "pending"
// until an administrator verifies it. The role is assigned by the server.
export default function ProviderSignup() {
  const { registerProvider } = useAuth();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<ServiceCategory>();
  const [district, setDistrict] = useState<string>();
  const [experience, setExperience] = useState<number>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [certified, setCertified] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const clear = (field: Field) => errors[field] && setErrors((e) => ({ ...e, [field]: undefined }));

  const validate = (): Errors => ({
    name: validateName(name),
    mobile: validatePhone(mobile ? toFullNumber(mobile) : ''),
    email: validateEmail(email),
    category: category ? undefined : 'Please choose your primary trade',
    district: district ? undefined : 'Please choose your operating district',
    experience: experience !== undefined ? undefined : 'Please choose your experience',
    password: validatePassword(password),
    confirm: !confirm ? 'Please confirm your password' : confirm !== password ? 'Passwords do not match' : undefined,
    certify: certified ? undefined : 'Please confirm that your details are accurate',
  });

  const handleSubmit = async () => {
    const next = validate();
    setErrors(next);
    setFormError(undefined);
    if (Object.values(next).some(Boolean)) {
      setFormError('Please complete the highlighted fields.');
      return;
    }
    setSubmitting(true);
    try {
      await registerProvider({
        name: name.trim(),
        email: email.trim(),
        phone: toFullNumber(mobile),
        password,
        category: category!,
        serviceArea: district!,
        experienceYears: experience!,
      });
      // The auth layout redirects the new provider to /provider/dashboard.
    } catch (error) {
      setFormError(
        getFriendlyErrorMessage(error, {
          409: 'An account with this email already exists. Try signing in instead.',
        }),
      );
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ProviderBrand />

      <Pressable
        style={styles.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/auth/provider-login'))}
        accessibilityRole="link"
      >
        <Ionicons name="arrow-back" size={18} color={colors.primary} />
        <Text style={styles.backText}>Back to Login</Text>
      </Pressable>

      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          Create Provider Account
        </Text>
        <Text style={styles.subtitle}>Offer your plumbing, electrical or cleaning services across Sri Lanka.</Text>
      </View>

      <View style={styles.network}>
        <View style={styles.networkIcon}>
          <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
        </View>
        <View style={styles.networkText}>
          <Text style={styles.networkTitle}>Verified Technician Network</Text>
          <Text style={styles.networkBody}>
            After you sign up, add your services &amp; rates under Schedule. Our administrators then check your identity,
            contact, experience and services. Customers can book you once you are verified.
          </Text>
        </View>
      </View>

      {formError ? <FormMessage message={formError} /> : null}

      {/* Full name */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            Full Name <Text style={styles.req}>*</Text>
          </Text>
          <Text style={styles.hint}>As shown on NIC</Text>
        </View>
        <View style={[styles.inputRow, !!errors.name && styles.inputError]}>
          <Ionicons name="id-card-outline" size={19} color={colors.textMuted} />
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              clear('name');
            }}
            placeholder="e.g. Sunil Fernando"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            autoComplete="name"
            accessibilityLabel="Full name"
          />
        </View>
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}
      </View>

      {/* Mobile */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Mobile Number <Text style={styles.req}>*</Text>
        </Text>
        <View style={styles.mobileRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>LK +94</Text>
          </View>
          <View style={[styles.inputRow, styles.flex, !!errors.mobile && styles.inputError]}>
            <TextInput
              value={mobile}
              onChangeText={(t) => {
                setMobile(t);
                clear('mobile');
              }}
              placeholder="77 123 4567"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={12}
              accessibilityLabel="Mobile number"
            />
          </View>
        </View>
        {errors.mobile ? <Text style={styles.error}>{errors.mobile}</Text> : null}
      </View>

      {/* Email */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Email Address <Text style={styles.req}>*</Text>
        </Text>
        <View style={[styles.inputRow, !!errors.email && styles.inputError]}>
          <Ionicons name="mail-outline" size={19} color={colors.textMuted} />
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clear('email');
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email address"
          />
        </View>
        {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
      </View>

      {/* Trade */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Primary Trade / Category <Text style={styles.req}>*</Text>
        </Text>
        <View style={styles.chips}>
          {CATEGORIES.map((key) => (
            <Chip
              key={key}
              label={CATEGORY_META[key].label}
              icon={CATEGORY_META[key].icon}
              selected={category === key}
              onPress={() => {
                setCategory(key);
                clear('category');
              }}
            />
          ))}
        </View>
        {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
      </View>

      {/* District + experience */}
      <View style={styles.twoCol}>
        <SelectField
          label="Operating District"
          required
          placeholder="Select district"
          value={district}
          options={DISTRICT_OPTIONS}
          onChange={(v) => {
            setDistrict(v);
            clear('district');
          }}
          error={errors.district}
        />
        <SelectField
          label="Experience"
          required
          placeholder="Select"
          value={experience}
          options={EXPERIENCE_OPTIONS}
          onChange={(v) => {
            setExperience(v);
            clear('experience');
          }}
          error={errors.experience}
        />
      </View>

      {/* Password (required by the account system; not shown in the prototype) */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Password <Text style={styles.req}>*</Text>
        </Text>
        <View style={[styles.inputRow, !!errors.password && styles.inputError]}>
          <Ionicons name="lock-closed-outline" size={19} color={colors.textMuted} />
          <TextInput
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clear('password');
            }}
            placeholder="8–72 characters, letters and numbers"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            accessibilityLabel="Password"
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Confirm Password <Text style={styles.req}>*</Text>
        </Text>
        <View style={[styles.inputRow, !!errors.confirm && styles.inputError]}>
          <Ionicons name="lock-closed-outline" size={19} color={colors.textMuted} />
          <TextInput
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              clear('confirm');
            }}
            placeholder="Re-enter your password"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            accessibilityLabel="Confirm password"
          />
        </View>
        {errors.confirm ? <Text style={styles.error}>{errors.confirm}</Text> : null}
      </View>

      {/* Certification */}
      <Pressable
        style={[styles.certify, !!errors.certify && styles.certifyError]}
        onPress={() => {
          setCertified((v) => !v);
          clear('certify');
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: certified }}
      >
        <View style={[styles.checkbox, certified && styles.checkboxOn]}>
          {certified ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
        </View>
        <Text style={styles.certifyText}>
          I certify that my trade details, operating district and experience are accurate and can be verified.
        </Text>
      </Pressable>
      {errors.certify ? <Text style={styles.error}>{errors.certify}</Text> : null}

      <Button title="Complete Sign Up" icon="arrow-forward" onPress={handleSubmit} loading={submitting} />

      <View style={styles.signInRow}>
        <Text style={styles.muted}>Already registered with FIX & CLEAN CO.? </Text>
        <Link href="/auth/provider-login" style={styles.link} accessibilityRole="link">
          Sign In
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  titleBlock: { gap: 4 },
  title: { fontSize: 26, fontWeight: '600', color: colors.text, lineHeight: 32 },
  subtitle: { fontSize: 13, color: colors.textMuted },
  network: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.lavender,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  networkIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkText: { flex: 1, gap: 4 },
  networkTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  networkBody: { fontSize: 13, lineHeight: 18, color: colors.text },
  field: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  req: { color: colors.danger },
  hint: { fontSize: 12, color: colors.textMuted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.text, paddingVertical: spacing.sm },
  mobileRow: { flexDirection: 'row', gap: spacing.sm },
  prefix: {
    backgroundColor: colors.lavenderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  prefixText: { fontSize: 15, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  certify: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  certifyError: { borderColor: colors.danger },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary },
  certifyText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  error: { fontSize: 12, color: colors.danger },
  signInRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingBottom: spacing.lg },
  muted: { fontSize: 14, color: colors.textMuted },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
