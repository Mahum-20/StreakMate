import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPalette, lightColors, darkColors } from './colors';
import { typography, TypographyScale } from './typography';
import { spacing, borderRadius, shadows } from './spacing';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemePreference;
  isDark: boolean;
  colors: ColorPalette;
  typography: TypographyScale;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  setTheme: (theme: ThemePreference) => Promise<void>;
}

const THEME_STORAGE_KEY = '@streakmate_theme_preference';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemePreference(saved);
        }
      } catch (err) {
        console.warn('Failed to load theme preference from storage', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (preference: ThemePreference) => {
    try {
      setThemePreference(preference);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch (err) {
      console.warn('Failed to save theme preference', err);
    }
  };

  const isDark = useMemo(() => {
    if (themePreference === 'system') {
      return systemColorScheme === 'dark';
    }
    return themePreference === 'dark';
  }, [themePreference, systemColorScheme]);

  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  const value: ThemeContextValue = useMemo(
    () => ({
      theme: themePreference,
      isDark,
      colors,
      typography,
      spacing,
      borderRadius,
      shadows,
      setTheme,
    }),
    [themePreference, isDark, colors]
  );

  if (!isLoaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
