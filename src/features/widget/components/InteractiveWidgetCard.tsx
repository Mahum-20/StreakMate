import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const { skyConfig } = useSky();
  const isDark = !skyConfig.isDarkContent; // false = daylight/light, true = twilight/night/dark

  // Palette: Soft Sky — Minimal Editorial
  const colors = {
    bg: isDark ? '#172630' : '#F5F7F5',
    surface: isDark ? '#223642' : '#E5EFED',
    border: isDark ? '#223642' : '#E5EFED',
    textPrimary: isDark ? '#EDF3F1' : '#273D4B',
    textSecondary: isDark ? '#A4B8B4' : '#73817F',
    accentMint: isDark ? '#77D2C5' : '#55B9AD',
    flameAccent: isDark ? '#FFA21A' : '#FF9600',
    checkBorder: isDark ? '#405869' : '#D1DDD9',
    checkBgPending: isDark ? '#223642' : '#FFFFFF',
    checkBgDone: '#FF9600', // Matching brand logo flame color!
    divider: isDark ? '#223642' : '#E5EFED',
    dayDotActive: isDark ? '#FFA21A' : '#FF9600',
    dayDotInactive: isDark ? '#223642' : '#E5EFED',
  };

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
      <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="flame-outline" size={28} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No habits pinned
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Select 1 or 2 habits below to display on your home screen widget
          </Text>
        </View>
      </View>
    );
  }

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

  const isSingle = items.length === 1;
  const singleItem = items[0];
  const singleDone = singleItem.userCheckedIn || checkedMap[singleItem.id];
  const singleLoading = Boolean(loadingMap[singleItem.id]);

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0, Sunday = 6

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        {/* Editorial Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
            {isSingle ? 'TODAY • HABIT' : `TODAY • ${items.length} HABITS`}
          </Text>
          <View style={styles.headerFlame}>
            <Ionicons name="flame" size={15} color={colors.flameAccent} />
          </View>
        </View>

        {/* 1. SINGLE-STREAK CONFIGURATION (Focused Minimal Editorial) */}
        {isSingle ? (
          <View style={styles.singleContainer}>
            <View style={styles.singleMainRow}>
              {/* Left Info Column */}
              <TouchableOpacity
                style={styles.singleInfoCol}
                activeOpacity={0.8}
                onPress={() => onOpenDetails?.(singleItem.id)}
              >
                <Text
                  style={[
                    styles.singleHabitName,
                    {
                      color: colors.textPrimary,
                      textDecorationLine: singleDone ? 'line-through' : 'none',
                      opacity: singleDone ? 0.75 : 1,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {singleItem.name}
                </Text>

                {/* Big Streak Number + Unit */}
                <View style={styles.singleNumberRow}>
                  <Text style={[styles.singleStreakNumber, { color: colors.flameAccent }]}>
                    {singleDone && !singleItem.userCheckedIn ? singleItem.currentStreak + 1 : singleItem.currentStreak}
                  </Text>
                  <Text style={[styles.singleStreakUnit, { color: colors.textSecondary }]}>
                    {singleItem.currentStreak === 1 ? 'day streak' : 'days streak'}
                  </Text>
                </View>

                {/* Status Label */}
                <Text
                  style={[
                    styles.singleStatusLabel,
                    { color: singleDone ? colors.accentMint : colors.textSecondary },
                  ]}
                >
                  {singleDone ? 'Completed today ✓' : `${singleItem.hoursRemaining}h remaining today`}
                </Text>
              </TouchableOpacity>

              {/* Right: Circular Check-in Action (Logo Matching Color #FF9600) */}
              <TouchableOpacity
                style={[
                  styles.circleCheckButton,
                  singleDone
                    ? { backgroundColor: colors.checkBgDone, borderColor: colors.checkBgDone }
                    : { backgroundColor: colors.checkBgPending, borderColor: colors.checkBorder },
                ]}
                onPress={() => handleCheckIn(singleItem)}
                activeOpacity={0.7}
                disabled={singleDone || singleLoading}
              >
                {singleLoading ? (
                  <ActivityIndicator size="small" color={colors.flameAccent} />
                ) : singleDone ? (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                ) : (
                  <View style={[styles.innerRingDot, { borderColor: colors.textSecondary }]} />
                )}
              </TouchableOpacity>
            </View>

            {/* Subtle 7-Day Progress Dots Row */}
            <View style={styles.sevenDaysRow}>
              {daysOfWeek.map((day, idx) => {
                const isCurrent = idx === todayDayIndex;
                const isPast = idx < todayDayIndex;
                const isCheckedDay = isCurrent ? singleDone : isPast;

                return (
                  <View key={idx} style={styles.dayDotCol}>
                    <Text
                      style={[
                        styles.dayDotText,
                        {
                          color: isCurrent
                            ? colors.textPrimary
                            : colors.textSecondary,
                          fontWeight: isCurrent ? '700' : '500',
                        },
                      ]}
                    >
                      {day}
                    </Text>
                    <View
                      style={[
                        styles.dayDot,
                        {
                          backgroundColor: isCheckedDay
                            ? colors.dayDotActive
                            : colors.dayDotInactive,
                          borderWidth: isCurrent && !singleDone ? 1.5 : 0,
                          borderColor: colors.flameAccent,
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          /* 2. TWO-STREAK CONFIGURATION (Two Visually Distinct Intentional Rows) */
          <View style={styles.twoStreaksContainer}>
            {items.map((item, index) => {
              const isDone = item.userCheckedIn || checkedMap[item.id];
              const isLoading = Boolean(loadingMap[item.id]);

              return (
                <View key={item.id}>
                  {index > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />}

                  <View style={styles.twoStreakRow}>
                    {/* Habit Info */}
                    <TouchableOpacity
                      style={styles.twoStreakInfo}
                      activeOpacity={0.8}
                      onPress={() => onOpenDetails?.(item.id)}
                    >
                      <Text
                        style={[
                          styles.twoStreakName,
                          {
                            color: colors.textPrimary,
                            textDecorationLine: isDone ? 'line-through' : 'none',
                            opacity: isDone ? 0.75 : 1,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>

                      <View style={styles.twoStreakMetaRow}>
                        <Ionicons name="flame" size={13} color={colors.flameAccent} style={{ marginRight: 4 }} />
                        <Text style={[styles.twoStreakCount, { color: colors.flameAccent }]}>
                          {isDone && !item.userCheckedIn ? item.currentStreak + 1 : item.currentStreak}
                          <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>
                            {item.currentStreak === 1 ? ' day' : ' days'}
                          </Text>
                        </Text>
                        <Text style={[styles.twoStreakStatus, { color: colors.textSecondary }]}>
                          {isDone ? ' • Done ✓' : ` • ${item.hoursRemaining}h left`}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Circular Action Button (Matching Logo Flame Color) */}
                    <TouchableOpacity
                      style={[
                        styles.twoCircleButton,
                        isDone
                          ? { backgroundColor: colors.checkBgDone, borderColor: colors.checkBgDone }
                          : { backgroundColor: colors.checkBgPending, borderColor: colors.checkBorder },
                      ]}
                      onPress={() => handleCheckIn(item)}
                      activeOpacity={0.7}
                      disabled={isDone || isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={colors.flameAccent} />
                      ) : isDone ? (
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      ) : (
                        <View style={[styles.twoInnerRingDot, { borderColor: colors.textSecondary }]} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  headerFlame: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  // Single Streak Styles
  singleContainer: {
    paddingVertical: 2,
  },
  singleMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  singleInfoCol: {
    flex: 1,
    paddingRight: 12,
  },
  singleHabitName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  singleNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  singleStreakNumber: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  singleStreakUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  singleStatusLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  circleCheckButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  sevenDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.12)',
  },
  dayDotCol: {
    alignItems: 'center',
  },
  dayDotText: {
    fontSize: 10,
    marginBottom: 4,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Two Streak Styles
  twoStreaksContainer: {
    paddingVertical: 2,
  },
  twoStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowDivider: {
    height: 1,
    width: '100%',
    marginVertical: 6,
  },
  twoStreakInfo: {
    flex: 1,
    paddingRight: 10,
  },
  twoStreakName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  twoStreakMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  twoStreakCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  twoStreakStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  twoCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoInnerRingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
});
