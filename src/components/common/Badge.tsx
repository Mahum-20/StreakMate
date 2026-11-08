import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';

export type BadgeVariant = 'active' | 'at_risk' | 'broken' | 'completed' | 'pending' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', style }) => {
  const { colors, typography, borderRadius, spacing } = useTheme();
  let sky = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sky = useSky();
  } catch {}

  const skyAccent = sky?.skyConfig.accent || colors.accent;
  const skyBadgeBg = sky?.skyConfig.badgeBg || colors.accentMuted;

  const getColors = () => {
    switch (variant) {
      case 'active':
        return { bg: skyBadgeBg, text: skyAccent };
      case 'completed':
        return { bg: colors.successMuted, text: colors.success };
      case 'at_risk':
        return { bg: colors.warningMuted, text: colors.warning };
      case 'broken':
        return { bg: colors.dangerMuted, text: colors.danger };
      case 'pending':
        return { bg: colors.surfaceSubtle, text: sky?.skyConfig.textSecondary || colors.textSecondary };
      default:
        return { bg: colors.badgeBg, text: sky?.skyConfig.textSecondary || colors.textSecondary };
    }
  };

  const palette = getColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.bg,
          borderRadius: borderRadius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Text style={[typography.badge, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
