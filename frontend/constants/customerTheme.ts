// Customer design tokens sampled from the Customer reference screens
// (frontend/reference-images/customer/*.jpeg): lavender off-white surfaces,
// white cards, deep-blue primary, bright-blue form CTAs, green verification,
// amber trust accents. Plus Jakarta Sans headings, Inter body text (fonts are
// loaded app-wide in app/_layout.tsx).
export const cc = {
  primary: '#006194', // Sign In / Book Now / Track Booking
  primaryBright: '#007BBA', // Complete Sign Up / Confirm Booking
  primaryDeep: '#004C74',
  onPrimary: '#FFFFFF',
  primaryFixed: '#CDE5FF', // icon wells, avatar fills
  bg: '#FAF8FF', // page background
  card: '#FFFFFF',
  containerLow: '#F2F3FF', // inner wells (receipt rows, review footer)
  container: '#EAEDFF', // info strips, trust cards, inputs on cards
  containerHigh: '#E2E7FF', // chips, tags, pills
  text: '#131B2E',
  textMuted: '#404850',
  textSubtle: '#707881',
  outline: '#BFC7D1',
  outlineSoft: '#E1E4F2',
  success: '#006947',
  successBright: '#6FFBBE', // "Verified" pills
  onSuccessBright: '#00513A',
  successSoft: '#DDF4EA',
  amber: '#855300', // electrical prices, stars on profile, trust accents
  amberBright: '#FEA619',
  amberSoft: '#FFDDB8',
  star: '#F5A623',
  danger: '#BA1A1A',
  dangerSoft: '#FFDAD6',
  dangerSurface: '#FFEDEA',
  etaAmber: '#E58A00',
  etaBg: '#FFF3E0',
  liveGreen: '#00875A',
  liveBg: '#DDF7E8',
  cancelBg: '#FDEEEC',
  cancelText: '#B3261E',
  googleBorder: '#E0E3EB',
  shadow: '#131B2E',
};

export const cf = {
  heading: 'PlusJakartaSans_700Bold',
  headingSemi: 'PlusJakartaSans_600SemiBold',
  headingExtra: 'PlusJakartaSans_800ExtraBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const cr = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };

// Page gutter used by every Customer screen (the references use ~16px).
export const GUTTER = 16;

// Soft card shadow seen on the reference cards.
export const cardShadow = {
  shadowColor: cc.shadow,
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

// Category colours and MaterialCommunityIcons glyphs from the Home reference (Plumbing blue, Electrical amber, Cleaning green).
export const CATEGORY_TONE = {
  plumbing: { tint: '#006194', bg: '#CDE5FF', price: '#006194', icon: 'pipe-wrench' },
  electrical: { tint: '#855300', bg: '#FFDDB8', price: '#855300', icon: 'power-plug-outline' },
  cleaning: { tint: '#006947', bg: '#C9EEDD', price: '#006947', icon: 'spray-bottle' },
} as const;
