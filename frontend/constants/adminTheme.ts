// Admin design tokens sampled from the Admin Figma prototype
// (file p1bUwfoxID2H7FONcoHbSQ, frames 1:1360 Login, 1:1519 Dashboard,
// 1:1773 Provider Verifications, 1:2050 Verification Detail Review,
// 1:2209 User Management, 1:2430 Booking Monitor). Material-3-style tonal
// palette, Plus Jakarta Sans headings, Inter body text, Roboto Mono status lines.
export const ac = {
  primary: '#006194',
  onPrimary: '#FFFFFF',
  primaryFixed: '#CDE5FF', // light blue icon tiles / avatar fills
  surface: '#FAF8FF', // page background
  card: '#FFFFFF',
  containerLow: '#F2F3FF', // inputs, inner wells
  container: '#EAEDFF', // light buttons
  containerHigh: '#E2E7FF', // chips, tags, info cards
  chipMuted: '#DAE2FD',
  text: '#131B2E',
  textMuted: '#3F4850',
  outline: '#707881',
  outlineVariant: '#BFC7D1',
  dark: '#283044', // "SIGN IN AS ADMIN"
  success: '#006947',
  successBright: '#6FFBBE', // ACTIVE / VERIFIED pills
  onSuccessBright: '#00513A',
  successSoft: '#E6F0ED',
  tertiary: '#855300',
  tertiaryContainer: '#FFDDB8',
  onTertiaryContainer: '#2A1700',
  amber: '#FEA619', // PENDING chip / priority card top border
  error: '#BA1A1A',
  errorStrong: '#BE2828',
  errorContainer: '#FFDAD6',
  errorSoft: '#FFE9E6',
  onErrorContainer: '#93000A',
  dotOrange: '#F59E0B',
};

export const af = {
  heading: 'PlusJakartaSans_700Bold',
  headingSemi: 'PlusJakartaSans_600SemiBold',
  headingExtra: 'PlusJakartaSans_800ExtraBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'RobotoMono_500Medium',
  monoBold: 'RobotoMono_700Bold',
};

export const ar = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };

// Soft card shadow used throughout the Figma frames.
export const cardShadow = {
  shadowColor: '#131B2E',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
