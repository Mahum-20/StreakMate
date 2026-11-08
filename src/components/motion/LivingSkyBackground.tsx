import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSky } from '@/core/environment/SkyContext';
import {
  SKY_BACKGROUND_IMAGES,
  CLOUD_ASSETS,
  SkyPhase,
} from '@/core/environment/TimeOfDayEngine';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Natural star coordinate distribution for twilight and night
const REALISTIC_STARS = [
  { x: SCREEN_WIDTH * 0.12, y: SCREEN_HEIGHT * 0.06, size: 1.8, minA: 0.25, maxA: 0.8 },
  { x: SCREEN_WIDTH * 0.28, y: SCREEN_HEIGHT * 0.10, size: 2.4, minA: 0.35, maxA: 0.9 },
  { x: SCREEN_WIDTH * 0.44, y: SCREEN_HEIGHT * 0.04, size: 1.6, minA: 0.20, maxA: 0.75 },
  { x: SCREEN_WIDTH * 0.62, y: SCREEN_HEIGHT * 0.14, size: 2.2, minA: 0.30, maxA: 0.85 },
  { x: SCREEN_WIDTH * 0.78, y: SCREEN_HEIGHT * 0.08, size: 1.8, minA: 0.25, maxA: 0.8 },
  { x: SCREEN_WIDTH * 0.91, y: SCREEN_HEIGHT * 0.16, size: 2.6, minA: 0.40, maxA: 0.95 },
  { x: SCREEN_WIDTH * 0.18, y: SCREEN_HEIGHT * 0.22, size: 1.8, minA: 0.20, maxA: 0.7 },
  { x: SCREEN_WIDTH * 0.84, y: SCREEN_HEIGHT * 0.25, size: 2.2, minA: 0.35, maxA: 0.85 },
  { x: SCREEN_WIDTH * 0.35, y: SCREEN_HEIGHT * 0.32, size: 1.6, minA: 0.20, maxA: 0.7 },
  { x: SCREEN_WIDTH * 0.70, y: SCREEN_HEIGHT * 0.35, size: 2.0, minA: 0.30, maxA: 0.8 },
];

interface LivingSkyBackgroundProps {
  children?: React.ReactNode;
}

export const LivingSkyBackground: React.FC<LivingSkyBackgroundProps> = ({ children }) => {
  const { skyConfig, isAppActive, isReducedMotion } = useSky();

  // Crossfade state between previous and active sky photography
  const [activePhase, setActivePhase] = useState<SkyPhase>(skyConfig.phase);
  const [prevPhase, setPrevPhase] = useState<SkyPhase | null>(null);
  const crossfadeAnim = useSharedValue(1);

  // Cinematic Slow Camera Movement (Ken Burns: translation & subtle scale)
  const cameraTranslateX = useSharedValue(0);
  const cameraTranslateY = useSharedValue(0);
  const cameraScale = useSharedValue(1.08);

  // Natural Cloud Layer Horizontal Drift
  const cloud1X = useSharedValue(0);
  const cloud2X = useSharedValue(0);

  // Atmospheric Light Bloom Breathing
  const lightBloomOpacity = useSharedValue(0.1);

  // Nighttime Star Twinkle
  const starTwinkle = useSharedValue(0.5);

  // Handle crossfade when skyConfig.phase transitions
  useEffect(() => {
    if (skyConfig.phase !== activePhase) {
      setPrevPhase(activePhase);
      setActivePhase(skyConfig.phase);
      crossfadeAnim.value = 0;
      crossfadeAnim.value = withTiming(
        1,
        { duration: 800, easing: Easing.inOut(Easing.cubic) }
      );
    }
  }, [skyConfig.phase, activePhase, crossfadeAnim]);

  // Motion Graphics Animations
  useEffect(() => {
    if (!isAppActive || isReducedMotion) {
      cancelAnimation(cameraTranslateX);
      cancelAnimation(cameraTranslateY);
      cancelAnimation(cameraScale);
      cancelAnimation(cloud1X);
      cancelAnimation(cloud2X);
      cancelAnimation(lightBloomOpacity);
      cancelAnimation(starTwinkle);
      return;
    }

    // A. Slow Cinematic Camera Movement (42s horizontal translation, 32s vertical, 36s scale)
    cameraTranslateX.value = withRepeat(
      withTiming(18, { duration: 42000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    cameraTranslateY.value = withRepeat(
      withTiming(-10, { duration: 32000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    cameraScale.value = withRepeat(
      withTiming(1.12, { duration: 36000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // B. Cloud Movement (Smooth, natural non-harmonic horizontal drift)
    cloud1X.value = withRepeat(
      withTiming(SCREEN_WIDTH * 0.35, { duration: 52000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    cloud2X.value = withRepeat(
      withTiming(-SCREEN_WIDTH * 0.3, { duration: 38000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // C. Atmospheric Light Bloom Breathing (Gentle 7-second pulse)
    lightBloomOpacity.value = withRepeat(
      withTiming(0.18, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // D. Nighttime Star Twinkle (Gentle 3.5-second shimmer)
    starTwinkle.value = withRepeat(
      withTiming(0.9, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    return () => {
      cancelAnimation(cameraTranslateX);
      cancelAnimation(cameraTranslateY);
      cancelAnimation(cameraScale);
      cancelAnimation(cloud1X);
      cancelAnimation(cloud2X);
      cancelAnimation(lightBloomOpacity);
      cancelAnimation(starTwinkle);
    };
  }, [
    isAppActive,
    isReducedMotion,
    cameraTranslateX,
    cameraTranslateY,
    cameraScale,
    cloud1X,
    cloud2X,
    lightBloomOpacity,
    starTwinkle,
  ]);

  // Camera animated transform style
  const cameraAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cameraTranslateX.value },
      { translateY: cameraTranslateY.value },
      { scale: cameraScale.value },
    ],
  }));

  // Incoming image crossfade animated style
  const activeImageStyle = useAnimatedStyle(() => ({
    opacity: crossfadeAnim.value,
  }));

  // Cloud drift animated styles
  const cloud1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cloud1X.value }],
  }));

  const cloud2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cloud2X.value }],
  }));

  // Light bloom animated style
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: lightBloomOpacity.value,
  }));

  // Star twinkle animated style
  const starStyle = useAnimatedStyle(() => ({
    opacity: starTwinkle.value,
  }));

  // Natural cloud opacity based on phase
  const cloudOpacity =
    activePhase === 'morning'
      ? 0.32
      : activePhase === 'afternoon'
      ? 0.28
      : activePhase === 'golden_hour'
      ? 0.36
      : activePhase === 'twilight'
      ? 0.22
      : 0.14;

  const isNightOrTwilight = activePhase === 'night' || activePhase === 'twilight';

  return (
    <View style={styles.root}>
      {/* 1. ACTUAL FULL-SCREEN PHOTOGRAPHIC SKY BACKGROUND WITH CINEMATIC CAMERA MOTION */}
      <View style={styles.backgroundHost} pointerEvents="none">
        <Animated.View style={[styles.cameraContainer, cameraAnimatedStyle]}>
          {/* Outgoing previous photo (during crossfade) */}
          {prevPhase && prevPhase !== activePhase && (
            <Image
              source={SKY_BACKGROUND_IMAGES[prevPhase]}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              priority="high"
              cachePolicy="memory-disk"
            />
          )}

          {/* Active current photo */}
          <Animated.View style={[StyleSheet.absoluteFill, activeImageStyle]}>
            <Image
              source={SKY_BACKGROUND_IMAGES[activePhase]}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              priority="high"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        </Animated.View>

        {/* 2. SUBTLE FLOATING WISPY CLOUD LAYERS (Natural transparent cloud movement) */}
        <Animated.View
          style={[
            styles.cloudLayer,
            { top: SCREEN_HEIGHT * 0.08, opacity: cloudOpacity },
            cloud1Style,
          ]}
        >
          <Image
            source={CLOUD_ASSETS.layer1}
            style={styles.cloudImage1}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.cloudLayer,
            { top: SCREEN_HEIGHT * 0.32, opacity: cloudOpacity * 0.8 },
            cloud2Style,
          ]}
        >
          <Image
            source={CLOUD_ASSETS.layer2}
            style={styles.cloudImage2}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </Animated.View>

        {/* 3. ATMOSPHERIC LIGHTING BLOOM OVERLAY (Gentle sunlight/moonlight warmth) */}
        <Animated.View style={[StyleSheet.absoluteFill, bloomStyle]}>
          <LinearGradient
            colors={
              isNightOrTwilight
                ? ['rgba(186, 230, 253, 0.12)', 'rgba(147, 197, 253, 0.05)', 'transparent']
                : activePhase === 'golden_hour'
                ? ['rgba(251, 146, 60, 0.22)', 'rgba(254, 215, 170, 0.10)', 'transparent']
                : ['rgba(255, 255, 255, 0.20)', 'rgba(254, 240, 138, 0.08)', 'transparent']
            }
            locations={[0, 0.35, 0.85]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* 4. NIGHTTIME SUBTLE TWINKLING STARS (Restrained, realistic starlight) */}
        {skyConfig.starsVisible && (
          <Animated.View style={[StyleSheet.absoluteFill, starStyle]}>
            {REALISTIC_STARS.map((star, idx) => (
              <View
                key={`star-${idx}`}
                style={[
                  styles.star,
                  {
                    left: star.x,
                    top: star.y,
                    width: star.size,
                    height: star.size,
                    borderRadius: star.size / 2,
                  },
                ]}
              />
            ))}
          </Animated.View>
        )}

        {/* 5. SOFT CONTRAST VIGNETTE FOR OPTIMAL FOREGROUND READABILITY */}
        <LinearGradient
          colors={
            isNightOrTwilight
              ? ['rgba(5, 8, 20, 0.15)', 'transparent', 'rgba(5, 8, 20, 0.40)']
              : ['rgba(0, 0, 0, 0.04)', 'transparent', 'rgba(0, 0, 0, 0.15)']
          }
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* 6. FOREGROUND APPLICATION CONTENT LAYER */}
      <View style={styles.foregroundHost}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#050814',
  },
  backgroundHost: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  cameraContainer: {
    // Generous bleeding margin so Ken Burns camera panning and scaling never letterboxes
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.08,
    bottom: -SCREEN_HEIGHT * 0.08,
    left: -SCREEN_WIDTH * 0.10,
    right: -SCREEN_WIDTH * 0.10,
  },
  cloudLayer: {
    position: 'absolute',
    left: -SCREEN_WIDTH * 0.2,
    right: -SCREEN_WIDTH * 0.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudImage1: {
    width: SCREEN_WIDTH * 1.4,
    height: 180,
  },
  cloudImage2: {
    width: SCREEN_WIDTH * 1.3,
    height: 150,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2.5,
  },
  foregroundHost: {
    flex: 1,
  },
});
