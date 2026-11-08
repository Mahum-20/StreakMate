import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CelestialBackgroundProps {
  children?: React.ReactNode;
}

// Fixed deterministic positions for celestial starlight particles
const STAR_COORDINATES = [
  { x: SCREEN_WIDTH * 0.12, y: SCREEN_HEIGHT * 0.08, size: 2.5, baseOpacity: 0.7, delay: 0 },
  { x: SCREEN_WIDTH * 0.28, y: SCREEN_HEIGHT * 0.14, size: 3.5, baseOpacity: 0.9, delay: 600 },
  { x: SCREEN_WIDTH * 0.72, y: SCREEN_HEIGHT * 0.06, size: 2.0, baseOpacity: 0.6, delay: 1200 },
  { x: SCREEN_WIDTH * 0.88, y: SCREEN_HEIGHT * 0.12, size: 3.0, baseOpacity: 0.85, delay: 300 },
  { x: SCREEN_WIDTH * 0.48, y: SCREEN_HEIGHT * 0.22, size: 2.5, baseOpacity: 0.75, delay: 1800 },
  { x: SCREEN_WIDTH * 0.18, y: SCREEN_HEIGHT * 0.35, size: 2.0, baseOpacity: 0.5, delay: 900 },
  { x: SCREEN_WIDTH * 0.82, y: SCREEN_HEIGHT * 0.42, size: 3.0, baseOpacity: 0.8, delay: 1500 },
  { x: SCREEN_WIDTH * 0.35, y: SCREEN_HEIGHT * 0.58, size: 2.5, baseOpacity: 0.65, delay: 400 },
  { x: SCREEN_WIDTH * 0.65, y: SCREEN_HEIGHT * 0.72, size: 3.2, baseOpacity: 0.9, delay: 1100 },
  { x: SCREEN_WIDTH * 0.15, y: SCREEN_HEIGHT * 0.82, size: 2.0, baseOpacity: 0.55, delay: 2000 },
  { x: SCREEN_WIDTH * 0.85, y: SCREEN_HEIGHT * 0.88, size: 2.8, baseOpacity: 0.75, delay: 750 },
];

export const CelestialBackground: React.FC<CelestialBackgroundProps> = ({ children }) => {
  // Cloud 1: Ethereal Lavender Watercolor Drift
  const cloud1X = useSharedValue(0);
  const cloud1Y = useSharedValue(0);

  // Cloud 2: Celestial Periwinkle Drift
  const cloud2X = useSharedValue(0);
  const cloud2Y = useSharedValue(0);

  // Cloud 3: Rose Quartz Watercolor Pulse
  const cloud3Scale = useSharedValue(1);

  // Starlight Twinkle Shared Values
  const starPulse = useSharedValue(0.4);

  useEffect(() => {
    // Perpetual, organic out-of-phase floating drift (Lissajous curves)
    cloud1X.value = withRepeat(
      withTiming(45, { duration: 21000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    cloud1Y.value = withRepeat(
      withTiming(32, { duration: 17000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    cloud2X.value = withRepeat(
      withTiming(-50, { duration: 26000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    cloud2Y.value = withRepeat(
      withTiming(-38, { duration: 19000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    cloud3Scale.value = withRepeat(
      withTiming(1.18, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // Starlight twinkle pulse
    starPulse.value = withRepeat(
      withTiming(1.0, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const cloud1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cloud1X.value },
      { translateY: cloud1Y.value },
    ],
  }));

  const cloud2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cloud2X.value },
      { translateY: cloud2Y.value },
    ],
  }));

  const cloud3AnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cloud3Scale.value },
    ],
  }));

  const starAnimatedStyle = useAnimatedStyle(() => ({
    opacity: starPulse.value,
  }));

  return (
    <View style={styles.container}>
      {/* Base Celestial Watercolor Gradient (Light & Dreamlike) */}
      <LinearGradient
        colors={[
          '#F3E8FF', // Soft Lavender Mist
          '#E0E7FF', // Celestial Periwinkle Haze
          '#FCE7F3', // Rose Quartz Sunrise Wash
          '#F8F7FF', // Starlight White Base
        ]}
        locations={[0.0, 0.35, 0.70, 1.0]}
        start={{ x: 0.1, y: 0.0 }}
        end={{ x: 0.9, y: 1.0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Animated Watercolor Clouds & Light Orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Floating Cloud 1: Flowing Ethereal Lavender ([Color1]) */}
        <Animated.View
          style={[
            styles.cloudOrb,
            styles.cloudLavender,
            cloud1AnimatedStyle,
          ]}
        />

        {/* Floating Cloud 2: Flowing Celestial Periwinkle / Azure ([Color2]) */}
        <Animated.View
          style={[
            styles.cloudOrb,
            styles.cloudPeriwinkle,
            cloud2AnimatedStyle,
          ]}
        />

        {/* Floating Cloud 3: Warm Rose Quartz Watercolor Blossom */}
        <Animated.View
          style={[
            styles.cloudOrb,
            styles.cloudRose,
            cloud3AnimatedStyle,
          ]}
        />

        {/* Twinkling Celestial Starlight & Shimmering Dust */}
        {STAR_COORDINATES.map((star, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                backgroundColor: '#FFFFFF',
              },
              starAnimatedStyle,
            ]}
          />
        ))}
      </View>

      {/* Foreground Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F8F7FF',
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
  cloudOrb: {
    position: 'absolute',
    borderRadius: 200,
    opacity: 0.38,
  },
  cloudLavender: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_WIDTH * 0.95,
    top: -SCREEN_HEIGHT * 0.05,
    left: -SCREEN_WIDTH * 0.2,
    backgroundColor: '#D8B4FE', // Soft flowing lavender
  },
  cloudPeriwinkle: {
    width: SCREEN_WIDTH * 1.05,
    height: SCREEN_WIDTH * 1.05,
    top: SCREEN_HEIGHT * 0.25,
    right: -SCREEN_WIDTH * 0.25,
    backgroundColor: '#A5B4FC', // Soft celestial periwinkle
  },
  cloudRose: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    bottom: SCREEN_HEIGHT * 0.05,
    left: -SCREEN_WIDTH * 0.1,
    backgroundColor: '#FBCFE8', // Rose quartz flush
  },
  star: {
    position: 'absolute',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});
