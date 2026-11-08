import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { Card } from '../common/Card';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export interface FriendCardProps {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  activeStreakCount: number;
  onStartStreak?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const FriendCard: React.FC<FriendCardProps> = ({
  displayName,
  username,
  avatarUrl,
  activeStreakCount,
  onStartStreak,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();
  let sky = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sky = useSky();
  } catch {}

  const textPrimary = sky?.skyConfig.textPrimary || colors.textPrimary;
  const textSecondary = sky?.skyConfig.textSecondary || colors.textSecondary;

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.content}>
        <Avatar name={displayName} imageUrl={avatarUrl} size={44} />

        <View style={[styles.info, { marginLeft: spacing.md }]}>
          <Text style={[typography.headline, { color: textPrimary }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[typography.caption, { color: textSecondary }]}>
            @{username}
          </Text>
        </View>

        <View style={styles.actionContainer}>
          {activeStreakCount > 0 ? (
            <Badge
              label={`${activeStreakCount} streak${activeStreakCount > 1 ? 's' : ''}`}
              variant="active"
            />
          ) : onStartStreak ? (
            <Button
              title="Start"
              size="sm"
              variant="outline"
              onPress={onStartStreak}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  actionContainer: {
    marginLeft: 12,
  },
});
