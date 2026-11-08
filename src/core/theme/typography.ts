import { TextStyle } from 'react-native';

export interface TypographyScale {
  display: TextStyle;
  editorialTitle: TextStyle;
  title1: TextStyle;
  title2: TextStyle;
  title3: TextStyle;
  headline: TextStyle;
  bodyLarge: TextStyle;
  bodyMedium: TextStyle;
  bodySmall: TextStyle;
  caption: TextStyle;
  badge: TextStyle;
  microLabel: TextStyle;
  statNumber: TextStyle;
}

export const typography: TypographyScale = {
  display: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  editorialTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  title1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  title2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  title3: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '600',
  },
  headline: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  badge: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  microLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  statNumber: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
};
