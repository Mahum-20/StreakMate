export interface ColorPalette {
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  card: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  accentMuted: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  badgeBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  // Celestial Watercolor Reverie & Atmosphere Tokens
  skyStart: string;
  skyMid: string;
  skyEnd: string;
  skyLight: string;
  appleMint: string;
  appleTeal: string;
  appleIndigo: string;
  appleOrange: string;
  applePink: string;
  glassSurface: string;
  glassBorder: string;
  cardGlow: string;
  celestialLavender: string;
  celestialPeriwinkle: string;
  celestialRose: string;
  celestialStardust: string;
  starlightCream: string;
}

export const lightColors: ColorPalette = {
  background: '#F8FAFC', // Crisp celestial porcelain
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9', // Crisp neutral slate tint (no purple)
  surfaceElevated: '#FFFFFF',
  card: 'rgba(255, 255, 255, 0.88)', // Translucent glass
  border: 'rgba(2, 132, 199, 0.18)', // Celestial cyan boundary
  borderSubtle: 'rgba(2, 132, 199, 0.10)',
  textPrimary: '#0F172A', // Deep slate ink
  textSecondary: '#334155', // Slate secondary
  textMuted: '#64748B', // Slate muted
  primary: '#0284C7', // Sky Blue
  primaryForeground: '#FFFFFF',
  accent: '#0284C7', // Vibrant Sky Blue (no purple)
  accentForeground: '#FFFFFF',
  accentMuted: 'rgba(2, 132, 199, 0.12)',
  success: '#10B981', // Clean Emerald Mint
  successMuted: '#D1FAE5',
  warning: '#F59E0B',
  warningMuted: '#FEF3C7',
  danger: '#EF4444',
  dangerMuted: '#FEE2E2',
  badgeBg: 'rgba(2, 132, 199, 0.12)',
  tabBarBg: 'rgba(255, 255, 255, 0.92)',
  tabBarBorder: 'rgba(2, 132, 199, 0.15)',
  tabBarActive: '#0284C7',
  tabBarInactive: '#64748B',
  skyStart: '#38BDF8',
  skyMid: '#0284C7',
  skyEnd: '#0369A1',
  skyLight: '#F0F9FF',
  appleMint: '#10B981',
  appleTeal: '#06B6D4',
  appleIndigo: '#0284C7',
  appleOrange: '#EA580C',
  applePink: '#F43F5E',
  glassSurface: 'rgba(255, 255, 255, 0.84)',
  glassBorder: 'rgba(255, 255, 255, 0.75)',
  cardGlow: 'rgba(2, 132, 199, 0.12)',
  celestialLavender: '#38BDF8',
  celestialPeriwinkle: '#0284C7',
  celestialRose: '#38BDF8',
  celestialStardust: '#FDE68A',
  starlightCream: '#FFFDF7',
};

export const darkColors: ColorPalette = {
  background: '#050814', // Deep midnight navy
  surface: '#0A0E27',
  surfaceSubtle: '#0F1738',
  surfaceElevated: '#161F4D',
  card: 'rgba(15, 23, 42, 0.85)',
  border: 'rgba(56, 189, 248, 0.18)',
  borderSubtle: 'rgba(56, 189, 248, 0.10)',
  textPrimary: '#FFFFFF', // Starlight white
  textSecondary: '#E2E8F0', // Soft starlight slate
  textMuted: '#94A3B8',
  primary: '#38BDF8',
  primaryForeground: '#050814',
  accent: '#38BDF8', // Celestial Sky Cyan (no purple)
  accentForeground: '#050814',
  accentMuted: 'rgba(56, 189, 248, 0.18)',
  success: '#10B981',
  successMuted: '#064E3B',
  warning: '#FDE68A',
  warningMuted: '#451A03',
  danger: '#F87171',
  dangerMuted: '#450A0A',
  badgeBg: 'rgba(56, 189, 248, 0.15)',
  tabBarBg: 'rgba(10, 14, 39, 0.90)',
  tabBarBorder: 'rgba(56, 189, 248, 0.18)',
  tabBarActive: '#38BDF8',
  tabBarInactive: '#94A3B8',
  skyStart: '#050814',
  skyMid: '#0A0E27',
  skyEnd: '#0F1738',
  skyLight: '#050814',
  appleMint: '#10B981',
  appleTeal: '#06B6D4',
  appleIndigo: '#38BDF8',
  appleOrange: '#EA580C',
  applePink: '#F43F5E',
  glassSurface: 'rgba(15, 23, 42, 0.80)',
  glassBorder: 'rgba(255, 255, 255, 0.22)',
  cardGlow: 'rgba(56, 189, 248, 0.15)',
  celestialLavender: '#38BDF8',
  celestialPeriwinkle: '#0284C7',
  celestialRose: '#38BDF8',
  celestialStardust: '#FDE68A',
  starlightCream: '#FFFDF7',
};
