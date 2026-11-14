import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { Card } from '../common/Card';
import { Badge, BadgeVariant } from '../common/Badge';
import { Avatar } from '../common/Avatar';

export interface StreakCardProps {
  id: string;
  name: string;
  friendName: string;
  friendAvatarUrl?: string | null;
  currentStreak: number;
  status: 'active' | 'at_risk' | 'broken' | 'paused' | 'frozen';
  freezesRemaining?: number;
  hoursRemaining?: number;
  userCheckedIn: boolean;
  friendCheckedIn: boolean;
  onPress: () => void;
  onCheckIn?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  name,
  friendName,
  friendAvatarUrl,
  currentStreak,
  status,
  freezesRemaining,
  hoursRemaining,
  userCheckedIn,
  friendCheckedIn,
  onPress,
  onCheckIn,
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

  const getStatusBadge = (): { label: string; variant: BadgeVariant } => {
    if (status === 'broken') return { label: 'Broken', variant: 'broken' };
    if (status === 'paused') return { label: 'Paused', variant: 'neutral' };
    if (status === 'frozen') return { label: 'Protected 🧊', variant: 'neutral' };
    if (status === 'at_risk' || (hoursRemaining !== undefined && hoursRemaining <= 3)) {
      return {
        label: hoursRemaining ? `${hoursRemaining}h left` : 'At Risk',
        variant: 'at_risk',
      };
    }
    if (userCheckedIn && friendCheckedIn) {
      return { label: 'Checked In', variant: 'completed' };
    }
    return { label: 'Active', variant: 'active' };
  };

  const badgeInfo = getStatusBadge();

  return (
    <Card onPress={onPress} style={[styles.card, style]}>
      {/* Top row: Friend info or Solo indicator + Status badge */}
      <View style={styles.topRow}>
        <View style={styles.friendInfo}>
          {friendName === 'Solo Habit' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: sky?.skyConfig.badgeBg || colors.surfaceSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 6,
                }}
              >
                <Ionicons name="sparkles" size={13} color={accentColor} />
              </View>
              <Text style={[typography.microLabel, { color: textSecondary, letterSpacing: 1.6 }]}>
                SOLO RHYTHM
              </Text>
            </View>
          ) : (
            <>
              <Avatar name={friendName} imageUrl={friendAvatarUrl} size={28} />
              <Text
                style={[
                  typography.caption,
                  { color: textSecondary, marginLeft: spacing.xs, fontWeight: '500' },
                ]}
                numberOfLines={1}
              >
                with {friendName}
              </Text>
            </>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {freezesRemaining !== undefined && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: sky?.skyConfig.isDarkContent
                  ? 'rgba(119, 210, 197, 0.18)'
                  : 'rgba(85, 185, 173, 0.22)',
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: borderRadius.sm,
              }}
            >
              <Ionicons
                name="snow"
                size={11}
                color={status === 'frozen' ? '#55B9AD' : textSecondary}
                style={{ marginRight: 3 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: status === 'frozen' ? '#55B9AD' : textSecondary,
                    fontWeight: '700',
                    fontSize: 11,
                  },
                ]}
              >
                {freezesRemaining}
              </Text>
            </View>
          )}
          <Badge label={badgeInfo.label} variant={badgeInfo.variant} />
        </View>
      </View>

      {/* Middle row: Streak Name and Streak Counter */}
      <View style={[styles.middleRow, { marginVertical: spacing.sm }]}>
        <View style={styles.nameContainer}>
          <Text
            style={[typography.title3, { color: textPrimary, fontWeight: '600' }]}
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>

        <View style={styles.counterRow}>
          <Ionicons
            name={status === 'frozen' ? 'snow' : 'flame'}
            size={24}
            color={
              status === 'broken'
                ? colors.textMuted
                : status === 'frozen'
                ? '#55B9AD'
                : accentColor
            }
          />
          <Text
            style={[
              typography.statNumber,
              {
                color:
                  status === 'broken'
                    ? colors.textMuted
                    : status === 'frozen'
                    ? '#55B9AD'
                    : textPrimary,
                marginLeft: 4,
              },
            ]}
          >
            {currentStreak}
          </Text>
        </View>
      </View>

      {/* Bottom row: Participant status + Check-in trigger */}
      <View
        style={[
          styles.bottomRow,
          {
            borderTopColor: sky?.skyConfig.glassBorderBottom || colors.borderSubtle,
            borderTopWidth: 1,
            paddingTop: spacing.sm,
            marginTop: spacing.xs,
          },
        ]}
      >
        <View style={styles.participationStatus}>
          {/* User Status */}
          <View style={styles.statusPill}>
            <Ionicons
              name={userCheckedIn ? 'checkmark-circle' : 'time-outline'}
              size={15}
              color={userCheckedIn ? colors.appleMint : colors.textMuted}
            />
            <Text
              style={[
                typography.caption,
                {
                  color: userCheckedIn ? colors.appleMint : textSecondary,
                  marginLeft: 4,
                  fontWeight: userCheckedIn ? '600' : '400',
                },
              ]}
            >
              {userCheckedIn ? 'Today Complete ✓' : 'Awaiting Check-in'}
            </Text>
          </View>

          {/* Friend Status (only show if not solo) */}
          {friendName !== 'Solo Habit' && (
            <View style={[styles.statusPill, { marginLeft: spacing.md }]}>
              <Ionicons
                name={friendCheckedIn ? 'checkmark-circle' : 'time-outline'}
                size={15}
                color={friendCheckedIn ? colors.appleMint : colors.textMuted}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: friendCheckedIn ? colors.appleMint : textSecondary,
                    marginLeft: 4,
                  },
                ]}
              >
                {friendName.split(' ')[0]}: {friendCheckedIn ? 'Done' : 'Pending'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Check-in Button */}
        {!userCheckedIn && status !== 'broken' && onCheckIn && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              onCheckIn();
            }}
            style={[
              styles.checkInBtn,
              {
                backgroundColor: accentColor,
                borderRadius: borderRadius.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Check in for ${name}`}
          >
            <Text style={[typography.caption, { color: sky?.skyConfig.accentForeground || '#FFFFFF', fontWeight: '700' }]}>
              Check In
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flex: 1,
    marginRight: 12,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkInBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
