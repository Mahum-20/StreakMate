import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { WidgetStreakSnapshot, widgetService } from '../widgetService';
import { StreakCelebrationModal } from '@/components/modals/StreakCelebrationModal';

interface InteractiveWidgetCardProps {
  snapshots?: WidgetStreakSnapshot[];
  snapshot?: WidgetStreakSnapshot | null;
  currentUserId: string;
  onCheckInCompleted?: () => void;
  onOpenDetails?: (streakId: string) => void;
}

export const InteractiveWidgetCard: React.FC<InteractiveWidgetCardProps> = ({
  snapshots,
  snapshot,
  currentUserId,
  onCheckInCompleted,
  onOpenDetails,
}) => {
  const { typography } = useTheme();
  const { skyConfig } = useSky();

  // Consolidate single snapshot vs multi snapshots (up to 2)
  const items: WidgetStreakSnapshot[] = snapshots && snapshots.length > 0
    ? snapshots.slice(0, 2)
    : snapshot
    ? [snapshot]
    : [];

  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [celebrationStreak, setCelebrationStreak] = useState<{
    visible: boolean;
    name: string;
    count: number;
  }>({ visible: false, name: '', count: 0 });

  if (items.length === 0) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: skyConfig.isDarkContent
              ? 'rgba(255, 255, 255, 0.90)'
              : 'rgba(15, 23, 42, 0.85)',
            borderColor: skyConfig.isDarkContent
              ? 'rgba(255, 255, 255, 0.8)'
              : 'rgba(255, 255, 255, 0.15)',
          },
        ]}
      >
        <View style={styles.emptyContent}>
          <View style={styles.emptyMascotCircle}>
            <Ionicons name="flame" size={36} color="#FF9600" />
          </View>
          <Text style={[typography.headline, { color: skyConfig.textPrimary, marginTop: 10 }]}>
            No Streaks Pinned Yet
          </Text>
          <Text style={[typography.caption, { color: skyConfig.textSecondary, textAlign: 'center', marginTop: 4 }]}>
            Select 1 or 2 habits below to display on your home screen widget with quick checkboxes!
          </Text>
        </View>
      </View>
    );
  }

  const allCompleted = items.every((s) => s.userCheckedIn || checkedMap[s.id]);

  const handleCheckIn = async (item: WidgetStreakSnapshot) => {
    const isDone = item.userCheckedIn || checkedMap[item.id];
    if (isDone || loadingMap[item.id]) return;

    setLoadingMap((prev) => ({ ...prev, [item.id]: true }));
    const res = await widgetService.quickCheckIn(item.id, currentUserId);
    setLoadingMap((prev) => ({ ...prev, [item.id]: false }));

    if (res.success) {
      setCheckedMap((prev) => ({ ...prev, [item.id]: true }));
      setCelebrationStreak({
        visible: true,
        name: item.name,
        count: res.allCompleted ? item.currentStreak + 1 : item.currentStreak,
      });
      onCheckInCompleted?.();
    }
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: skyConfig.isDarkContent
              ? '#FFFFFF'
              : '#131F24',
            borderColor: skyConfig.isDarkContent
              ? '#E5E5E5'
              : '#2C3E48',
          },
        ]}
      >
        {/* Top Cute Header: Mascot Mood & Speech Bubble */}
        <View style={styles.mascotRow}>
          <View style={styles.mascotBadge}>
            <Ionicons
              name={allCompleted ? 'sparkles' : 'flame'}
              size={22}
              color={allCompleted ? '#58CC02' : '#FF9600'}
            />
          </View>

          {/* Cute Speech Bubble */}
          <View
            style={[
              styles.speechBubble,
              {
                backgroundColor: allCompleted
                  ? '#F0FDF4'
                  : skyConfig.isDarkContent
                  ? '#FFFBEB'
                  : '#202F36',
                borderColor: allCompleted
                  ? '#BBF7D0'
                  : skyConfig.isDarkContent
                  ? '#FEF08A'
                  : '#334155',
              },
            ]}
          >
            <Text
              style={[
                styles.speechText,
                {
                  color: allCompleted
                    ? '#15803D'
                    : skyConfig.isDarkContent
                    ? '#B45309'
                    : '#FDE047',
                },
              ]}
              numberOfLines={1}
            >
              {allCompleted
                ? "Streak safe! You're on fire today! 🔥"
                : items.length === 1
                ? "Don't let the flame die today! ⏱️"
                : "Check off your habits for today! 🎯"}
            </Text>
          </View>
        </View>

        {/* Streaks List (1 or 2 rows with checkbox) */}
        <View style={styles.streaksContainer}>
          {items.map((item, index) => {
            const isDone = item.userCheckedIn || checkedMap[item.id];
            const isLoading = Boolean(loadingMap[item.id]);

            return (
              <View key={item.id}>
                {index > 0 && <View style={[styles.itemDivider, { backgroundColor: skyConfig.isDarkContent ? '#F3F4F6' : '#2C3E48' }]} />}

                <View style={styles.streakRow}>
                  {/* Left: Streak Info */}
                  <TouchableOpacity
                    style={styles.streakInfo}
                    activeOpacity={0.8}
                    onPress={() => onOpenDetails?.(item.id)}
                  >
                    <View style={styles.titleWithFlame}>
                      <View style={styles.flamePill}>
                        <Ionicons name="flame" size={13} color="#FF9600" />
                        <Text style={styles.flameCount}>{item.currentStreak}</Text>
                      </View>
                      <Text
                        style={[
                          styles.streakTitle,
                          {
                            color: skyConfig.isDarkContent ? '#202F36' : '#FFFFFF',
                            textDecorationLine: isDone ? 'line-through' : 'none',
                            opacity: isDone ? 0.7 : 1,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.streakSubtitle,
                        { color: skyConfig.isDarkContent ? '#777777' : '#9BA9B0' },
                      ]}
                    >
                      {isDone
                        ? 'Completed today ✓'
                        : `${item.hoursRemaining}h remaining today`}
                    </Text>
                  </TouchableOpacity>

                  {/* Right: Chunky Interactive Checkbox */}
                  <TouchableOpacity
                    style={[
                      styles.checkboxButton,
                      isDone ? styles.checkboxCompleted : styles.checkboxPending,
                      {
                        backgroundColor: isDone ? '#58CC02' : '#F3F4F6',
                        borderBottomColor: isDone ? '#46A302' : '#E5E7EB',
                      },
                    ]}
                    onPress={() => handleCheckIn(item)}
                    activeOpacity={0.7}
                    disabled={isDone || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#58CC02" />
                    ) : isDone ? (
                      <Ionicons name="checkmark-sharp" size={20} color="#FFFFFF" />
                    ) : (
                      <View style={styles.checkboxInnerHole} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Celebration Modal on Widget Check-In */}
      <StreakCelebrationModal
        visible={celebrationStreak.visible}
        streakName={celebrationStreak.name}
        streakCount={celebrationStreak.count}
        message="Checked in directly from your widget! Streak extended! 🔥"
        onClose={() => setCelebrationStreak((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    borderWidth: 2,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyContent: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMascotCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFE0B2',
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  mascotBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFE0B2',
    marginRight: 10,
  },
  speechBubble: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  speechText: {
    fontSize: 12,
    fontWeight: '700',
  },
  streaksContainer: {
    width: '100%',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  itemDivider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  streakInfo: {
    flex: 1,
    paddingRight: 12,
  },
  titleWithFlame: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  flameCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    marginLeft: 3,
  },
  streakTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  streakSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  checkboxButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  checkboxPending: {
    borderColor: '#E2E8F0',
  },
  checkboxCompleted: {
    borderColor: '#46A302',
  },
  checkboxInnerHole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#CBD5E1',
  },
});
