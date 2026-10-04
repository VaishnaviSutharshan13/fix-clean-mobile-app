// Design tokens taken from the Milestone 02 high-fidelity prototype:
// a blue/navy primary, light surfaces, white cards, and status colours
// (green = verified/confirmed, orange = pending, red = cancelled/declined).
export const colors = {
  primary: '#0F5E9C',
  primaryDark: '#0B4A7D',
  primarySoft: '#E7F0F9',
  navy: '#0B1F3A',
  text: '#13233A',
  textMuted: '#5B6B80',
  textSubtle: '#8A97A8',
  background: '#F4F7FB',
  surface: '#FFFFFF',
  border: '#E1E7EF',
  borderStrong: '#C9D3DF',
  success: '#12805C',
  successSoft: '#DDF4EA',
  warning: '#B26A00',
  warningSoft: '#FFF1D6',
  danger: '#C62828',
  dangerSoft: '#FDECEC',
  star: '#F5A623',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  subheading: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 14, color: colors.text },
  caption: { fontSize: 12, color: colors.textMuted },
  label: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
};
