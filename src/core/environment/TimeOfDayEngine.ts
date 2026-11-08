export type SkyPhase = 'morning' | 'afternoon' | 'golden_hour' | 'twilight' | 'night';
export type SkyModePreference = 'auto' | SkyPhase;

export const SKY_BACKGROUND_IMAGES = {
  morning: require('../../../assets/backgrounds/morning.jpg'),
  afternoon: require('../../../assets/backgrounds/afternoon.jpg'),
  golden_hour: require('../../../assets/backgrounds/golden_hour.jpg'),
  twilight: require('../../../assets/backgrounds/twilight.jpg'),
  night: require('../../../assets/backgrounds/night.jpg'),
} as const;

export const CLOUD_ASSETS = {
  layer1: require('../../../assets/backgrounds/cloud_layer_1.png'),
  layer2: require('../../../assets/backgrounds/cloud_layer_2.png'),
} as const;

export interface SkyConfiguration {
  phase: SkyPhase;
  label: string;
  isDarkContent: boolean; // true = use dark text (morning/afternoon/golden_hour), false = use light text (twilight/night)
  imageAsset: any;
  // Gradients for the sky
  skyGradient: [string, string, string, string];
  skyLocations: [number, number, number, number];
  // Celestial lighting (Sun / Moon)
  celestialBody: 'sun' | 'moon';
  celestialCoordinates: { top: number; right: number };
  celestialGlowColor: string;
  celestialSize: number;
  celestialOpacity: number;
  // Horizon & atmospheric haze
  horizonGazeColor: string;
  horizonGlowOpacity: number;
  // Cloud layers
  cloudTint: string;
  cloudOpacityLayer1: number;
  cloudOpacityLayer2: number;
  cloudOpacityLayer3: number;
  // Stars
  starsVisible: boolean;
  starMaxOpacity: number;
  // Surface / Glass Styling
  glassSurface: string;
  glassBorderTop: string;
  glassBorderBottom: string;
  cardGlow: string;
  // Text & Accents
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentForeground: string;
  badgeBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  // Dynamic Greeting
  greeting: string;
  subGreeting: string;
}

export const SKY_CONFIGURATIONS: Record<SkyPhase, SkyConfiguration> = {
  morning: {
    phase: 'morning',
    label: 'Morning',
    isDarkContent: true,
    imageAsset: SKY_BACKGROUND_IMAGES.morning,
    skyGradient: ['#38BDF8', '#7DD3FC', '#BAE6FD', '#FEF3C7'],
    skyLocations: [0.0, 0.35, 0.70, 1.0],
    celestialBody: 'sun',
    celestialCoordinates: { top: 260, right: 230 }, // Rising lower near the horizon
    celestialGlowColor: 'rgba(253, 224, 71, 0.65)',
    celestialSize: 70,
    celestialOpacity: 0.92,
    horizonGazeColor: '#FDE68A',
    horizonGlowOpacity: 0.45,
    cloudTint: '#FFFBEB',
    cloudOpacityLayer1: 0.40,
    cloudOpacityLayer2: 0.32,
    cloudOpacityLayer3: 0.22,
    starsVisible: false,
    starMaxOpacity: 0.0,
    glassSurface: 'rgba(255, 255, 255, 0.82)',
    glassBorderTop: 'rgba(255, 255, 255, 0.92)',
    glassBorderBottom: 'rgba(255, 255, 255, 0.35)',
    cardGlow: 'rgba(253, 224, 71, 0.16)',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    accent: '#0284C7',
    accentForeground: '#FFFFFF',
    badgeBg: 'rgba(2, 132, 199, 0.12)',
    tabBarBg: 'rgba(255, 255, 255, 0.88)',
    tabBarBorder: 'rgba(186, 230, 253, 0.6)',
    tabBarActive: '#0284C7',
    tabBarInactive: '#64748B',
    greeting: 'Good morning',
    subGreeting: 'Start your rhythm with the morning light.',
  },
  afternoon: {
    phase: 'afternoon',
    label: 'Afternoon',
    isDarkContent: true,
    imageAsset: SKY_BACKGROUND_IMAGES.afternoon,
    skyGradient: ['#0369A1', '#0284C7', '#38BDF8', '#BAE6FD'], // Rich deep azure afternoon sky
    skyLocations: [0.0, 0.28, 0.62, 1.0],
    celestialBody: 'sun',
    celestialCoordinates: { top: 35, right: 60 }, // Sun has risen high in zenith
    celestialGlowColor: 'rgba(255, 255, 255, 0.85)',
    celestialSize: 88,
    celestialOpacity: 0.98,
    horizonGazeColor: '#0284C7',
    horizonGlowOpacity: 0.35,
    cloudTint: '#FFFFFF',
    cloudOpacityLayer1: 0.52,
    cloudOpacityLayer2: 0.40,
    cloudOpacityLayer3: 0.28,
    starsVisible: false,
    starMaxOpacity: 0.0,
    glassSurface: 'rgba(255, 255, 255, 0.84)',
    glassBorderTop: 'rgba(255, 255, 255, 0.94)',
    glassBorderBottom: 'rgba(255, 255, 255, 0.40)',
    cardGlow: 'rgba(2, 132, 199, 0.16)',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    accent: '#0284C7',
    accentForeground: '#FFFFFF',
    badgeBg: 'rgba(2, 132, 199, 0.12)',
    tabBarBg: 'rgba(255, 255, 255, 0.88)',
    tabBarBorder: 'rgba(224, 242, 254, 0.7)',
    tabBarActive: '#0284C7',
    tabBarInactive: '#64748B',
    greeting: 'Good afternoon',
    subGreeting: 'Maintain your focus and daily momentum.',
  },
  golden_hour: {
    phase: 'golden_hour',
    label: 'Golden Hour',
    isDarkContent: true,
    imageAsset: SKY_BACKGROUND_IMAGES.golden_hour,
    skyGradient: ['#F97316', '#FB923C', '#F472B6', '#FEF3C7'],
    skyLocations: [0.0, 0.35, 0.70, 1.0],
    celestialBody: 'sun',
    celestialCoordinates: { top: 120, right: 30 },
    celestialGlowColor: 'rgba(251, 146, 60, 0.65)',
    celestialSize: 88,
    celestialOpacity: 0.92,
    horizonGazeColor: '#FDE047',
    horizonGlowOpacity: 0.45,
    cloudTint: '#FED7AA',
    cloudOpacityLayer1: 0.55,
    cloudOpacityLayer2: 0.42,
    cloudOpacityLayer3: 0.30,
    starsVisible: false,
    starMaxOpacity: 0.0,
    glassSurface: 'rgba(255, 255, 255, 0.82)',
    glassBorderTop: 'rgba(255, 255, 255, 0.90)',
    glassBorderBottom: 'rgba(251, 146, 60, 0.25)',
    cardGlow: 'rgba(249, 115, 22, 0.15)',
    textPrimary: '#1C1917',
    textSecondary: '#44403C',
    textMuted: '#78716C',
    accent: '#EA580C',
    accentForeground: '#FFFFFF',
    badgeBg: 'rgba(234, 88, 12, 0.15)',
    tabBarBg: 'rgba(255, 255, 255, 0.88)',
    tabBarBorder: 'rgba(251, 146, 60, 0.30)',
    tabBarActive: '#EA580C',
    tabBarInactive: '#78716C',
    greeting: 'Golden hour clarity',
    subGreeting: 'Golden light reflects your consistency.',
  },
  twilight: {
    phase: 'twilight',
    label: 'Twilight',
    isDarkContent: false,
    imageAsset: SKY_BACKGROUND_IMAGES.twilight,
    skyGradient: ['#0A1128', '#101C42', '#1C2A5C', '#283870'],
    skyLocations: [0.0, 0.35, 0.70, 1.0],
    celestialBody: 'moon',
    celestialCoordinates: { top: 60, right: 50 },
    celestialGlowColor: 'rgba(224, 242, 254, 0.45)',
    celestialSize: 64,
    celestialOpacity: 0.85,
    horizonGazeColor: '#38BDF8',
    horizonGlowOpacity: 0.25,
    cloudTint: '#94A3B8',
    cloudOpacityLayer1: 0.40,
    cloudOpacityLayer2: 0.30,
    cloudOpacityLayer3: 0.20,
    starsVisible: true,
    starMaxOpacity: 0.65,
    glassSurface: 'rgba(15, 23, 42, 0.78)',
    glassBorderTop: 'rgba(255, 255, 255, 0.25)',
    glassBorderBottom: 'rgba(255, 255, 255, 0.08)',
    cardGlow: 'rgba(56, 189, 248, 0.15)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E2E8F0',
    textMuted: '#94A3B8',
    accent: '#38BDF8',
    accentForeground: '#0F172A',
    badgeBg: 'rgba(56, 189, 248, 0.20)',
    tabBarBg: 'rgba(15, 23, 42, 0.88)',
    tabBarBorder: 'rgba(56, 189, 248, 0.20)',
    tabBarActive: '#38BDF8',
    tabBarInactive: '#94A3B8',
    greeting: 'Good evening',
    subGreeting: 'Reflect and lock in your daily victories.',
  },
  night: {
    phase: 'night',
    label: 'Night',
    isDarkContent: false,
    imageAsset: SKY_BACKGROUND_IMAGES.night,
    skyGradient: ['#050814', '#0A0E27', '#0F1738', '#161F4D'],
    skyLocations: [0.0, 0.35, 0.70, 1.0],
    celestialBody: 'moon',
    celestialCoordinates: { top: 45, right: 65 },
    celestialGlowColor: 'rgba(255, 253, 247, 0.60)',
    celestialSize: 68,
    celestialOpacity: 0.95,
    horizonGazeColor: '#1E293B',
    horizonGlowOpacity: 0.20,
    cloudTint: '#94A3B8',
    cloudOpacityLayer1: 0.30,
    cloudOpacityLayer2: 0.20,
    cloudOpacityLayer3: 0.12,
    starsVisible: true,
    starMaxOpacity: 0.95,
    glassSurface: 'rgba(15, 23, 42, 0.80)',
    glassBorderTop: 'rgba(255, 255, 255, 0.22)',
    glassBorderBottom: 'rgba(255, 255, 255, 0.05)',
    cardGlow: 'rgba(56, 189, 248, 0.15)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E2E8F0',
    textMuted: '#94A3B8',
    accent: '#38BDF8',
    accentForeground: '#050814',
    badgeBg: 'rgba(56, 189, 248, 0.20)',
    tabBarBg: 'rgba(10, 14, 39, 0.90)',
    tabBarBorder: 'rgba(56, 189, 248, 0.20)',
    tabBarActive: '#38BDF8',
    tabBarInactive: '#94A3B8',
    greeting: 'Peaceful night',
    subGreeting: 'Rest easy. Your consistency is secured.',
  },
};

/**
 * Evaluates the current SkyPhase based on device local hours:
 * - Morning: 5:00 AM to 10:59 AM (hours 5 - 10)
 * - Afternoon: 11:00 AM to 3:59 PM (hours 11 - 15)
 * - Golden Hour: 4:00 PM to 5:59 PM (hours 16 - 17)
 * - Twilight: 6:00 PM to 7:59 PM (hours 18 - 19)
 * - Night: 8:00 PM to 4:59 AM (hours 20 - 23, and 0 - 4)
 */
export function getAutomaticSkyPhase(currentDate: Date = new Date()): SkyPhase {
  const hour = currentDate.getHours();

  if (hour >= 5 && hour < 11) {
    return 'morning';
  }
  if (hour >= 11 && hour < 16) {
    return 'afternoon';
  }
  if (hour >= 16 && hour < 18) {
    return 'golden_hour';
  }
  if (hour >= 18 && hour < 20) {
    return 'twilight';
  }
  return 'night';
}

/**
 * Resolves the active SkyConfiguration based on preference and local time.
 */
export function resolveSkyConfiguration(
  preference: SkyModePreference,
  currentDate: Date = new Date()
): SkyConfiguration {
  const phase = preference === 'auto' ? getAutomaticSkyPhase(currentDate) : preference;
  return SKY_CONFIGURATIONS[phase];
}
