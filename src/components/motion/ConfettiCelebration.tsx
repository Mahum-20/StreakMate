import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  animY: Animated.Value;
  animRotate: Animated.Value;
  animOpacity: Animated.Value;
}

interface ConfettiCelebrationProps {
  visible: boolean;
  onFinish?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#00C8B3', // Apple Mint
  '#00C3D0', // Apple Teal
  '#38BDF8', // Sky Blue
  '#FF8D28', // Apple Orange
  '#FF2D55', // Apple Pink
  '#6155F5', // Apple Indigo
  '#FBBF24', // Amber
];

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({ visible, onFinish }) => {
  const piecesRef = useRef<ConfettiPiece[]>([]);

  if (piecesRef.current.length === 0) {
    piecesRef.current = Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: Math.random() * 8 + 6,
      animY: new Animated.Value(0),
      animRotate: new Animated.Value(0),
      animOpacity: new Animated.Value(1),
    }));
  }

  useEffect(() => {
    if (!visible) return;

    const animations = piecesRef.current.map((piece) => {
      piece.animY.setValue(0);
      piece.animRotate.setValue(0);
      piece.animOpacity.setValue(1);

      return Animated.parallel([
        Animated.timing(piece.animY, {
          toValue: SCREEN_HEIGHT * 0.7,
          duration: 1600 + Math.random() * 600,
          useNativeDriver: true,
        }),
        Animated.timing(piece.animRotate, {
          toValue: 360 * (Math.random() > 0.5 ? 2 : -2),
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(piece.animOpacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.stagger(15, animations).start(() => {
      onFinish?.();
    });
  }, [visible, onFinish]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {piecesRef.current.map((piece) => {
        const rotate = piece.animRotate.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.confetti,
              {
                left: piece.x,
                width: piece.size,
                height: piece.size * 1.5,
                backgroundColor: piece.color,
                opacity: piece.animOpacity,
                transform: [{ translateY: piece.animY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  confetti: {
    position: 'absolute',
    top: -20,
    borderRadius: 3,
  },
});
