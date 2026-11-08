import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const { colors, typography, borderRadius, spacing } = useTheme();
  let sky = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sky = useSky();
  } catch {}

  const skyAccent = sky?.skyConfig.accent || colors.accent;
  const skyAccentForeground = sky?.skyConfig.accentForeground || colors.accentForeground;
  const skyTextPrimary = sky?.skyConfig.textPrimary || colors.textPrimary;

  const getContainerStyle = (): ViewStyle => {
    let bg = colors.primary;
    let borderColor = 'transparent';
    let borderWidth = 0;

    switch (variant) {
      case 'primary':
        bg = skyAccent;
        break;
      case 'secondary':
        bg = sky?.skyConfig.badgeBg || colors.surfaceSubtle;
        break;
      case 'outline':
        bg = 'transparent';
        borderColor = sky?.skyConfig.glassBorderTop || colors.border;
        borderWidth = 1;
        break;
      case 'ghost':
        bg = 'transparent';
        break;
      case 'danger':
        bg = colors.danger;
        break;
    }

    let minHeight = 48;
    let paddingHorizontal: number = spacing.lg;
    let paddingVertical: number = spacing.md;

    if (size === 'sm') {
      minHeight = 36;
      paddingHorizontal = spacing.md;
      paddingVertical = spacing.xs;
    } else if (size === 'lg') {
      minHeight = 54;
      paddingHorizontal = spacing.xl;
      paddingVertical = spacing.base;
    }

    return {
      backgroundColor: bg,
      borderColor,
      borderWidth,
      minHeight,
      paddingHorizontal,
      paddingVertical,
      borderRadius: borderRadius.md,
      opacity: disabled || loading ? 0.5 : 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    };
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return skyAccentForeground;
      case 'secondary':
        return skyTextPrimary;
      case 'outline':
      case 'ghost':
        return skyTextPrimary;
      case 'danger':
        return '#FFFFFF';
      default:
        return colors.primaryForeground;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={{ marginRight: spacing.sm }}>{icon}</View>}
          <Text
            style={[
              typography.headline,
              { color: getTextColor(), textAlign: 'center' },
              size === 'sm' && { fontSize: 13, lineHeight: 18 },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={{ marginLeft: spacing.sm }}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
