import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { AppState, AppStateStatus, AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SkyPhase,
  SkyModePreference,
  SkyConfiguration,
  resolveSkyConfiguration,
} from './TimeOfDayEngine';

export interface SkyContextValue {
  skyPhase: SkyPhase;
  skyConfig: SkyConfiguration;
  skyModePreference: SkyModePreference;
  setSkyModePreference: (preference: SkyModePreference) => Promise<void>;
  isAppActive: boolean;
  isReducedMotion: boolean;
}

const SKY_PREFERENCE_STORAGE_KEY = '@streakmate_sky_preference';

export const SkyContext = createContext<SkyContextValue | null>(null);

export const SkyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [skyModePreference, setPreferenceState] = useState<SkyModePreference>('auto');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isAppActive, setIsAppActive] = useState<boolean>(true);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load persisted user preference
  useEffect(() => {
    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem(SKY_PREFERENCE_STORAGE_KEY);
        if (
          saved === 'auto' ||
          saved === 'morning' ||
          saved === 'afternoon' ||
          saved === 'golden_hour' ||
          saved === 'twilight' ||
          saved === 'night'
        ) {
          setPreferenceState(saved as SkyModePreference);
        }
      } catch (err) {
        console.warn('Failed to load sky mode preference', err);
      } finally {
        setIsLoaded(true);
      }
    };

    init();
  }, []);

  // Listen to Accessibility reduce motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReducedMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setIsReducedMotion);
    return () => {
      subscription.remove();
    };
  }, []);

  // Re-evaluate on AppState change (foreground / background)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const active = nextState === 'active';
      setIsAppActive(active);
      if (active) {
        setCurrentDate(new Date());
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // Continuous boundary check every 30 seconds while active
  useEffect(() => {
    if (!isAppActive) return;

    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [isAppActive]);

  // Set preference handler
  const setSkyModePreference = useCallback(async (preference: SkyModePreference) => {
    try {
      setPreferenceState(preference);
      await AsyncStorage.setItem(SKY_PREFERENCE_STORAGE_KEY, preference);
    } catch (err) {
      console.warn('Failed to save sky preference', err);
    }
  }, []);

  // Resolve active configuration
  const skyConfig = useMemo(() => {
    return resolveSkyConfiguration(skyModePreference, currentDate);
  }, [skyModePreference, currentDate]);

  const value = useMemo(
    () => ({
      skyPhase: skyConfig.phase,
      skyConfig,
      skyModePreference,
      setSkyModePreference,
      isAppActive,
      isReducedMotion,
    }),
    [skyConfig, skyModePreference, setSkyModePreference, isAppActive, isReducedMotion]
  );

  if (!isLoaded) {
    return null;
  }

  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
};

export const useSky = (): SkyContextValue => {
  const context = useContext(SkyContext);
  if (!context) {
    throw new Error('useSky must be used within a SkyProvider');
  }
  return context;
};
