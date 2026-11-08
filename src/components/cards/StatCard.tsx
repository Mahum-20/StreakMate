import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { Card } from '../common/Card';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
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
  const iconColor = color || sky?.skyConfig.accent || colors.accent;

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: sky?.skyConfig.badgeBg || colors.surfaceSubtle,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[typography.statNumber, { color: textPrimary }]}>{value}</Text>
      </View>
      <Text style={[typography.caption, { color: textSecondary, marginTop: spacing.xs, fontWeight: '500' }]}>
        {label}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
