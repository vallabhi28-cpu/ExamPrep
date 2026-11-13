export const Colors = {
  // Pure modern neutral canvas (Linear / Vercel aesthetic)
  bg: '#FAFAFA',             // Canvas subtle zinc-50
  bgCard: '#FFFFFF',         // Crisp pure white
  card: '#FFFFFF',
  bgSecondary: '#F4F4F5',    // Zinc-100 for secondary pills, tags, search bars
  bgTertiary: '#E4E4E7',     // Zinc-200
  bgElevated: '#F4F4F5',     // Zinc-100
  bgSubtle: '#FAFAFA',

  // Hairline borders
  border: '#E4E4E7',         // Zinc-200 hairline border
  borderLight: '#F4F4F5',    // Zinc-100 hairline divider
  borderStrong: '#D4D4D8',   // Zinc-300 focus ring / active stroke

  // High-end primary action token (Obsidian black / Zinc 900)
  primary: '#18181B',        // Pure obsidian dark for buttons & primary CTA
  primaryLight: '#F4F4F5',   // Subtle zinc pill background
  primaryDark: '#09090B',    // Zinc-950

  // Brand electric accent (used deliberately for highlights & active indicators)
  brand: '#2563EB',          // Classic Cobalt Blue
  brandLight: '#EFF6FF',     // Blue-50
  blue: '#2563EB',
  blueLight: '#EFF6FF',

  // Semantic palette (refined, calm)
  secondary: '#0F766E',      // Emerald/Teal
  secondaryLight: '#F0FDFA',
  accent: '#E11D48',         // Rose
  accentLight: '#FFF1F2',
  accentYellow: '#D97706',   // Amber
  accentYellowLight: '#FFFBEB',
  accentPurple: '#6D28D9',   // Deep Violet
  accentPurpleLight: '#F5F3FF',

  // High contrast editorial typography
  text: '#09090B',
  textPrimary: '#09090B',    // Zinc-950 deep ink
  textSecondary: '#52525B',  // Zinc-600 clear body text
  textMuted: '#71717A',      // Zinc-500 secondary meta
  textTertiary: '#A1A1AA',   // Zinc-400 placeholder
  textInverse: '#FFFFFF',

  // Status indicators
  success: '#059669',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  error: '#E11D48',
  errorLight: '#FFF1F2',
  info: '#2563EB',
  infoLight: '#EFF6FF',
};

export const Fonts = {
  heading: 'System',
  body: 'System',
};

export const Radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};
