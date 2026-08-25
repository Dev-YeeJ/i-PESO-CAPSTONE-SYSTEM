// i-PESO mobile design tokens.
//
// Direction — **white carries the space, blue carries the meaning.**
// White is the dominant surface: canvas, cards, sheets, list backgrounds. Every piece of
// hierarchy, state, and emphasis is expressed in the blue scale below, with gradients
// reserved for the few moments that deserve weight (primary CTA, hero header, match ring).
// Colour outside the blue family is rationed hard — see `accent` below.

// ── Blue: the whole system ──────────────────────────────────────────────────────────────
// Anchored on the website so the brand stays recognizable across platforms: `blue800` is
// tailwind.config.js's `brand-navy`, `blue700` is the seeker role colour, and `blue600` is
// the web `brand-600`. Depth reads as hierarchy — the deeper the blue, the more permanent
// the element (text and headers sit deep; interactive surfaces sit mid; fills sit light).
const blue = {
  900: '#0B2242',
  800: '#123563',
  700: '#1A4B8C',
  600: '#2563EB',
  500: '#3B82F6',
  400: '#60A5FA',
  300: '#93C5FD',
  200: '#BFDBFE',
  100: '#DBEAFE',
  50: '#EFF6FF',
  // Deliberately not `as const`: these feed both the light and dark palettes, and literal
  // types here would make `darkColors` unassignable to `typeof colors`.
}

export const colors = {
  // Brand / primary palette
  primary: blue[800],
  primaryDark: blue[900],
  // Secondary / interactive blue — the colour of anything tappable.
  secondary: blue[600],

  // Blue scale (direct access for gradients, tints, and depth-based hierarchy)
  blue900: blue[900],
  blue800: blue[800],
  blue700: blue[700],
  blue600: blue[600],
  blue500: blue[500],
  blue400: blue[400],
  blue300: blue[300],
  blue200: blue[200],
  blue100: blue[100],
  blue50: blue[50],

  // ── Accent: rationed on purpose ───────────────────────────────────────────────────────
  // Amber survives from the brand in exactly one role: marking something the seeker has
  // *earned* (strong match, certificate match, accepted application). In an all-blue
  // interface a single warm colour is the fastest thing on screen to spot, which is why it
  // must never be spent on CTAs or decoration. Primary actions are blue.
  accent: '#F59E0B',
  accentPressed: '#D97706',
  accentSoft: '#FEF3C7',
  // Text/icon colour for content sitting on an `accent` fill. White fails WCAG on amber
  // (2.15:1); this pairing is 7.5:1.
  accentText: blue[900],

  // Surfaces. White dominates. `sunken` is a barely-there blue wash used to group or inset a
  // section without introducing a border.
  background: '#FFFFFF',
  canvas: '#FFFFFF',
  sunken: '#F5F8FD',
  surface: '#FFFFFF',
  white: '#FFFFFF',

  // Borders and subtle UI — tinted blue rather than neutral gray so edges belong to the palette.
  border: '#E2E9F5',
  borderStrong: '#C6D6EC',
  overlay: 'rgba(11, 34, 66, 0.04)',
  scrim: 'rgba(11, 34, 66, 0.45)',

  // Text
  textPrimary: blue[900],
  textSecondary: '#5A6B85',
  secondaryText: '#5A6B85',
  neutralText: blue[900],
  subtle: '#8697AE',

  // Utility colors
  info: blue[600],
  infoBackground: blue[50],
  infoBorder: blue[200],
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
}

// ── Gradients ───────────────────────────────────────────────────────────────────────────
// Tuples for expo-linear-gradient's `colors` prop. Every stop is dark enough to carry white
// text (the lightest, `blue600`, is 5.1:1 against white), so a gradient surface never
// silently breaks contrast partway across its own sweep.
//
// Used sparingly: a gradient marks a *moment* (the primary action, the screen's identity,
// an earned score). Gradients on ordinary cards are what make an interface look templated.
export const gradients = {
  /** Screen headers and identity surfaces. Deep, calm, authoritative. */
  brand: [blue[800], blue[700]] as const,
  /** Primary CTAs. Brighter and more energetic than `brand` so actions advance visually. */
  cta: [blue[600], blue[700]] as const,
  /** Large hero areas that need more travel across the sweep. */
  hero: [blue[700], blue[600], blue[500]] as const,
  /** Match ring / progress arcs — reads as "filling up". */
  progress: [blue[500], blue[600]] as const,
  /** A whisper of blue fading into white. For section washes behind white cards. */
  wash: [blue[50], '#FFFFFF'] as const,
  /** Overlay for imagery or map surfaces so white text stays readable on top. */
  scrim: ['rgba(11,34,66,0)', 'rgba(11,34,66,0.72)'] as const,
}

// Dark palette. Grounded in navy-black rather than pure black so the brand temperature
// survives the switch. Not yet wired to screens — see the theme provider work in Phase 6;
// screens still import `colors` directly.
export const darkColors: typeof colors = {
  ...colors,

  primary: blue[400],
  primaryDark: blue[900],
  secondary: blue[400],

  accent: '#FBBF24',
  accentPressed: '#F59E0B',
  accentSoft: '#3A2C0C',
  accentText: blue[900],

  background: '#0A1628',
  canvas: '#0A1628',
  sunken: '#08111F',
  surface: '#122238',
  white: '#FFFFFF',

  border: '#1F3350',
  borderStrong: '#2C4769',
  overlay: 'rgba(255, 255, 255, 0.05)',
  scrim: 'rgba(5, 15, 31, 0.6)',

  textPrimary: '#E8EEF7',
  textSecondary: '#A3B4CC',
  secondaryText: '#A3B4CC',
  neutralText: '#E8EEF7',
  subtle: '#7A8DA6',

  info: blue[400],
  infoBackground: '#15263D',
  infoBorder: '#27405F',
  success: '#4ADE80',
  successBackground: '#0E2A1A',
  successBorder: '#1C4D31',
  warning: '#FBBF24',
  warningBackground: '#2E2410',
  warningBorder: '#4D3D18',
  error: '#F87171',
  errorBackground: '#2E1414',
  errorBorder: '#4D2020',
  danger: '#F87171',
  dangerBackground: '#2E1414',
  dangerBorder: '#4D2020',
  muted: '#94A3B8',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
}

// Elevation scale — tinted with the brand navy instead of pure black so shadows read as
// "premium/soft" rather than flat drop-shadows. On a white-dominant interface these are the
// main way one white surface separates from another, so they do real work here.
// `card`/`elevated` are kept as aliases of `sm`/`lg` so every existing call site keeps working.
export const shadows = {
  xs: {
    shadowColor: blue[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: blue[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: blue[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: blue[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  /** Coloured glow beneath a blue CTA — makes the primary action read as lifted off the page. */
  ctaGlow: {
    shadowColor: blue[600],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  /** Retained for the amber "earned" markers. */
  accentGlow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  card: {
    shadowColor: blue[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  elevated: {
    shadowColor: blue[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
}

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
}

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

  // ── Figures: the type signature ───────────────────────────────────────────────────────
  // DM Serif Display is reserved for the two numbers that carry weight in an employment
  // app — salary and match percentage. Serif numerals read as "official record" rather than
  // "startup dashboard", which is the register a government employment service wants. On a
  // white-and-blue interface it is also the only typographic contrast in play, so it does
  // real hierarchy work. Do not use these for body copy or headings; the serif earns its
  // impact by being rare.
  figure: { fontSize: typography.stat, lineHeight: 34, fontFamily: typography.family.display },
  figureLarge: { fontSize: typography.hero, lineHeight: 38, fontFamily: typography.family.display },
  figureSmall: { fontSize: typography.heading, lineHeight: 26, fontFamily: typography.family.display },
} as const

// ── Motion ──────────────────────────────────────────────────────────────────────────────
// One vocabulary for every animation in the app, so timings stay consistent across screens.
// Every consumer must gate on `useMotion()` (hooks/useMotion.ts), which wraps Reanimated's
// reduced-motion check.
export const motion = {
  duration: {
    /** Micro-feedback: press states, icon swaps. Fast enough to feel instant. */
    instant: 120,
    /** Standard element transitions: fades, chips, badges. */
    quick: 200,
    /** Entrances, sheet reveals, list staggers. */
    normal: 280,
    /** Deliberate, attention-carrying moments: success states, carousel slides. */
    slow: 420,
  },
  /** Per-item delay for staggered list entrances. Cap the multiplier so long lists don't crawl. */
  stagger: 45,
  staggerMax: 8,
  spring: {
    /** Default for press feedback — settles fast with no visible overshoot. */
    press: { damping: 18, stiffness: 320, mass: 0.6 },
    /** Tab pill, toggles — a touch of bounce reads as responsive. */
    snappy: { damping: 15, stiffness: 220, mass: 0.8 },
    /** Bottom sheets and larger travel — smooth, no oscillation. */
    gentle: { damping: 22, stiffness: 140, mass: 1 },
    /** Reward moments (save, apply success) — the only place overshoot is welcome. */
    bouncy: { damping: 10, stiffness: 260, mass: 0.7 },
  },
  scale: {
    /** Card press. Subtle — larger values look cheap at card size. */
    cardPress: 0.975,
    /** Button/chip press. */
    buttonPress: 0.96,
    /** Icon reward pop peak. */
    pop: 1.18,
  },
} as const

export type ThemeColor = keyof typeof colors
export type ThemeSpacing = keyof typeof spacing
export type ThemeRadius = keyof typeof radii
export type ThemeTypography = keyof typeof typography
export type ThemeTextStyle = keyof typeof textStyles
export type ThemeGradient = keyof typeof gradients
