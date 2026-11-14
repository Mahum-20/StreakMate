import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'subtle';
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  variant = 'default',
  accessibilityLabel,
}) => {
  const { colors, borderRadius, spacing } = useTheme();
  let sky = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sky = useSky();
  } catch {
    // Graceful fallback if rendered outside SkyProvider (e.g. isolated test)
  }

  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor:
        variant === 'subtle'
          ? sky?.skyConfig.badgeBg || colors.surfaceSubtle
          : sky?.skyConfig.glassSurface || colors.card,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: sky?.skyConfig.glassBorderBottom || colors.border,
      borderTopColor: sky?.skyConfig.glassBorderTop || colors.glassBorder,
      padding: spacing.lg,
      shadowColor: sky?.skyConfig.accent || '#8B5CF6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 20,
      elevation: 3,
    };

    if (variant === 'elevated') {
      return {
        ...base,
        shadowOpacity: 0.16,
        shadowRadius: 28,
        elevation: 6,
      };
    }

    return base;
  };

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[getCardStyle(), style]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[getCardStyle(), style]}>{children}</View>;
};
