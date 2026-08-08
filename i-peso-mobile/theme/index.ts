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

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
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

export type ThemeColor = keyof typeof colors;
export type ThemeSpacing = keyof typeof spacing;
export type ThemeRadius = keyof typeof radii;
export type ThemeTypography = keyof typeof typography;
