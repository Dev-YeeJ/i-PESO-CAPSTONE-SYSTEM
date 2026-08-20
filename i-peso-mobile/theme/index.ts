export const colors = {
  // Brand / primary palette
  primary: '#0F172A',
  primaryDark: '#071024',
  // Secondary / brand blue
  secondary: '#2563EB',

  // Accent / CTA (yellow/gold)
  accent: '#F59E0B',
  accentPressed: '#D97706',
  accentSoft: '#FEF3C7',

  // Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  white: '#FFFFFF',

  // Borders and subtle UI
  border: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.04)',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  secondaryText: '#64748B',
  neutralText: '#0F172A',
  subtle: '#94A3B8',

  // Utility colors
  info: '#2563EB',
  infoBackground: '#EFF6FF',
  infoBorder: '#BFDBFE',
  success: '#166534',
  successBackground: '#DCFCE7',
  successBorder: '#86EFAC',
  warning: '#92400E',
  warningBackground: '#FFFBEB',
  warningBorder: '#FDE68A',
  error: '#991B1B',
  errorBackground: '#FEF2F2',
  errorBorder: '#FECACA',
  danger: '#991B1B',
  dangerBackground: '#FEF2F2',
  dangerBorder: '#FECACA',
  muted: '#475569',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

// Elevation scale — tinted with the brand navy instead of pure black so shadows read as
// "premium/soft" rather than flat drop-shadows. `card`/`elevated` are kept as aliases of
// `sm`/`lg` so every existing call site keeps working unchanged.
export const shadows = {
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  // Colored "glow" shadow for primary CTAs — makes the accent button read as elevated/tappable
  // instead of a flat rectangle, without going skeuomorphic.
  accentGlow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const typography = {
  hero: 32,
  stat: 30,
  display: 28,
  heading: 22,
  title: 18,
  body: 14,
  small: 12,
  label: 11,
  regular: '400' as const,
  medium: '600' as const,
  semibold: '700' as const,
  bold: '700' as const,
  weight: {
    regular: '400' as const,
    medium: '600' as const,
    semibold: '700' as const,
    bold: '700' as const,
  },
  family: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    bold: 'DMSans_700Bold',
    display: 'DMSerifDisplay_400Regular',
  },
};

// Composed text styles — the *recommended* way to style text going forward. Each preset
// bundles fontSize + lineHeight + the correct fontFamily variant in one object, so it's no
// longer possible to accidentally set `fontWeight` without the matching custom fontFamily
// (which silently falls back to the system font, since DM Sans is loaded as named weight
// variants, not a variable font — that mismatch was the single biggest source of
// inconsistent-looking text across the app).
export const textStyles = {
  display: { fontSize: typography.display, lineHeight: 34, fontFamily: typography.family.bold },
  heading: { fontSize: typography.heading, lineHeight: 28, fontFamily: typography.family.bold },
  title: { fontSize: typography.title, lineHeight: 24, fontFamily: typography.family.bold },
  titleMedium: { fontSize: typography.title, lineHeight: 24, fontFamily: typography.family.medium },
  body: { fontSize: typography.body, lineHeight: 20, fontFamily: typography.family.regular },
  bodyMedium: { fontSize: typography.body, lineHeight: 20, fontFamily: typography.family.medium },
  bodyBold: { fontSize: typography.body, lineHeight: 20, fontFamily: typography.family.bold },
  small: { fontSize: typography.small, lineHeight: 16, fontFamily: typography.family.regular },
  smallMedium: { fontSize: typography.small, lineHeight: 16, fontFamily: typography.family.medium },
  smallBold: { fontSize: typography.small, lineHeight: 16, fontFamily: typography.family.bold },
  label: { fontSize: typography.label, lineHeight: 14, fontFamily: typography.family.bold, letterSpacing: 0.4 },
} as const;

export type ThemeColor = keyof typeof colors;
export type ThemeSpacing = keyof typeof spacing;
export type ThemeRadius = keyof typeof radii;
export type ThemeTypography = keyof typeof typography;
export type ThemeTextStyle = keyof typeof textStyles;
