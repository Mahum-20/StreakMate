import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionTitle?: string;
  onActionPress?: () => void;
  actionStyle?: ViewStyle;
  actionTextStyle?: TextStyle;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'flame-outline',
  title,
  description,
  actionTitle,
  onActionPress,
  actionStyle,
  actionTextStyle,
  style,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  let sky = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sky = useSky();
  } catch {}

  const textPrimary = sky?.skyConfig.textPrimary || colors.textPrimary;
  const textSecondary = sky?.skyConfig.textSecondary || colors.textSecondary;
  const accentColor = sky?.skyConfig.accent || colors.accent;
  const surfaceSubtle = sky?.skyConfig.badgeBg || colors.surfaceSubtle;

  return (
    <View style={[styles.container, { padding: spacing.xxl }, style]}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: surfaceSubtle,
            borderRadius: borderRadius.full,
            width: 72,
            height: 72,
            marginBottom: spacing.base,
          },
        ]}
      >
        <Ionicons name={icon} size={32} color={accentColor} />
      </View>

      <Text
        style={[
          typography.title3,
          { color: textPrimary, textAlign: 'center', marginBottom: spacing.xs },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          typography.bodyMedium,
          {
            color: textSecondary,
            textAlign: 'center',
            marginBottom: actionTitle ? spacing.lg : 0,
            maxWidth: 280,
          },
        ]}
      >
        {description}
      </Text>

      {actionTitle && onActionPress && (
        <Button
          title={actionTitle}
          onPress={onActionPress}
          variant="primary"
          size="md"
          style={actionStyle}
          textStyle={actionTextStyle}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
