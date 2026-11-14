import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSky } from '@/core/environment/SkyContext';
import { WidgetStreakSnapshot, widgetService } from '../widgetService';
import { NIMBUS_MASCOT_ASSETS, resolveMascotContext } from '../mascotAssets';
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
  const isDark = !skyConfig.isDarkContent;

  // Rich pastel & sky palette
  const colors = {
    bg: isDark ? '#172430' : '#F5F7F6',
    surface: isDark ? '#213342' : '#FFFFFF',
    surfaceSubtle: isDark ? '#293E50' : '#E8F2F0',
    bubbleBg: isDark ? '#293E50' : '#E6F4F1',
    border: isDark ? '#2A4053' : '#DCE9E5',
    textPrimary: isDark ? '#EDF3F1' : '#233946',
    textSecondary: isDark ? '#9EB3AF' : '#6A7D87',
    mint: isDark ? '#77D2C5' : '#45ADA1',
    flame: '#FF9600',
    flameGold: '#FFA21A',
    celebrationBg: isDark ? '#231D38' : '#FFF9EE',
    celebrationBorder: isDark ? '#5C4A86' : '#FFE0B2',
    checkPendingBorder: isDark ? '#3D5568' : '#CFDFDB',
    checkPendingBg: isDark ? '#213342' : '#FFFFFF',
    checkDoneBg: '#FF9600',
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
    message?: string;
  }>({ visible: false, name: '', count: 0 });

  const allCompleted = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((it) => it.userCheckedIn || checkedMap[it.id]);
  }, [items, checkedMap]);

  const mascotContext = useMemo(() => {
    return resolveMascotContext(allCompleted);
  }, [allCompleted]);

  const mascotSource = NIMBUS_MASCOT_ASSETS[mascotContext.state];

  // Empty state
  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={styles.emptyContainer}>
          <Image
            source={NIMBUS_MASCOT_ASSETS.morning}
            style={{ width: 64, height: 64, marginBottom: 8 }}
            contentFit="contain"
          />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No habits pinned yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Select 1 or 2 habits below to bring Nimbus to life on your home screen!
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
        message: (res as any).earnedFreeze
          ? '🎉 20-Day Milestone reached! You earned +1 Streak Freeze 🧊!'
          : 'Checked in directly from your widget! Streak extended! 🔥',
      });
      onCheckInCompleted?.();
    }
  };

  const isSingle = items.length === 1;
  const singleItem = items[0];
  const singleIsDone = singleItem.userCheckedIn || checkedMap[singleItem.id];

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: allCompleted ? colors.celebrationBg : colors.bg,
            borderColor: allCompleted ? colors.celebrationBorder : colors.border,
          },
        ]}
      >
        {/* ========================================================== */}
        {/* LAYOUT C: CELEBRATION WIDGET (When all habits are done)    */}
        {/* ========================================================== */}
        {allCompleted ? (
          <View style={styles.celebrationContainer}>
            <Image
              source={NIMBUS_MASCOT_ASSETS.complete}
              style={styles.celebrationMascot}
              contentFit="contain"
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.celebrationBadgeRow}>
                <Ionicons name="sparkles" size={13} color="#FF9600" style={{ marginRight: 4 }} />
                <Text style={styles.celebrationBadgeText}>100% COMPLETE</Text>
              </View>
              <Text style={[styles.celebrationTitle, { color: colors.textPrimary }]}>
                All Done Today!
              </Text>
              <Text style={[styles.celebrationSubtitle, { color: colors.textSecondary }]}>
                {items.length === 1
                  ? `${singleItem.name} saved!`
                  : `Both habits completed! Momentum secured.`}
              </Text>
              <Text style={[styles.celebrationTomorrow, { color: colors.mint }]}>
                Nimbus is celebrating with you! See you tomorrow 🌤️
              </Text>
            </View>
          </View>
        ) : isSingle ? (
          /* ========================================================== */
          /* LAYOUT A: ONE STREAK (Hero Mascot Composition)              */
          /* ========================================================== */
          <View>
            {/* Header speech bubble row */}
            <View style={styles.singleTopRow}>
              <View style={[styles.speechBubble, { backgroundColor: colors.bubbleBg, borderColor: colors.border }]}>
                <Text style={[styles.speechBubbleText, { color: colors.mint }]}>
                  {mascotContext.speechBubble}
                </Text>
              </View>
              <Text style={[styles.headerDateLabel, { color: colors.textSecondary }]}>
                TODAY • 1 HABIT
              </Text>
            </View>

            {/* Mascot + Habit Card Composition */}
            <View style={styles.singleContentRow}>
              {/* Mascot Left */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onOpenDetails?.(singleItem.id)}
                style={styles.singleMascotCol}
              >
                <Image
                  source={mascotSource}
                  style={styles.singleMascotImage}
                  contentFit="contain"
                />
              </TouchableOpacity>

              {/* Habit Details Center */}
              <TouchableOpacity
                style={{ flex: 1, paddingLeft: 8, justifyContent: 'center' }}
                activeOpacity={0.7}
                onPress={() => onOpenDetails?.(singleItem.id)}
              >
                <Text style={[styles.singleHabitName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {singleItem.name}
                </Text>

                {/* Big Flame Counter */}
                <View style={styles.singleCounterRow}>
                  <Ionicons name="flame" size={26} color={colors.flame} style={{ marginRight: 4 }} />
                  <Text style={[styles.singleCounterNumber, { color: colors.flameGold }]}>
                    {singleIsDone && !singleItem.userCheckedIn
                      ? singleItem.currentStreak + 1
                      : singleItem.currentStreak}
                  </Text>
                  <Text style={[styles.singleCounterUnit, { color: colors.textSecondary }]}>
                    {singleItem.currentStreak === 1 ? 'day streak' : 'days streak'}
                  </Text>
                </View>

                {/* Status caption */}
                <Text
                  style={[
                    styles.singleStatusCaption,
                    { color: singleIsDone ? colors.mint : colors.textSecondary },
                  ]}
                >
                  {singleIsDone ? 'Completed today ✓' : 'Tap button to check in'}
                </Text>
              </TouchableOpacity>

              {/* Circular Action Button Right (Flame matching logo) */}
              <TouchableOpacity
                style={[
                  styles.singleCircleButton,
                  singleIsDone
                    ? { backgroundColor: colors.checkDoneBg, borderColor: colors.checkDoneBg }
                    : { backgroundColor: colors.checkPendingBg, borderColor: colors.checkPendingBorder },
                ]}
                onPress={() => handleCheckIn(singleItem)}
                activeOpacity={0.7}
                disabled={singleIsDone || loadingMap[singleItem.id]}
              >
                {loadingMap[singleItem.id] ? (
                  <ActivityIndicator size="small" color={colors.flame} />
                ) : singleIsDone ? (
                  <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                ) : (
                  <View style={[styles.innerRingDot, { borderColor: colors.textSecondary }]} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ========================================================== */
          /* LAYOUT B: TWO STREAKS (Duolingo 4x2 Duo Layout)            */
          /* ========================================================== */
          <View style={styles.twoMainContainer}>
            {/* Left Mascot Stage */}
            <View style={styles.twoMascotStage}>
              <View style={[styles.speechBubbleMini, { backgroundColor: colors.bubbleBg, borderColor: colors.border }]}>
                <Text style={[styles.speechBubbleTextMini, { color: colors.mint }]}>
                  {mascotContext.speechBubble}
                </Text>
              </View>
              <Image
                source={mascotSource}
                style={styles.twoMascotImage}
                contentFit="contain"
              />
            </View>

            {/* Right Habit Cards */}
            <View style={styles.twoCardsColumn}>
              {items.map((item, index) => {
                const isDone = item.userCheckedIn || checkedMap[item.id];
                const isLoading = loadingMap[item.id];

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.twoHabitCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        marginTop: index > 0 ? 8 : 0,
                      },
                    ]}
                  >
                    {/* Left: Info */}
                    <TouchableOpacity
                      style={{ flex: 1, marginRight: 8 }}
                      activeOpacity={0.7}
                      onPress={() => onOpenDetails?.(item.id)}
                    >
                      <Text style={[styles.twoHabitName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons name="flame" size={14} color={colors.flame} style={{ marginRight: 3 }} />
                        <Text style={[styles.twoStreakCount, { color: colors.flameGold }]}>
                          {isDone && !item.userCheckedIn ? item.currentStreak + 1 : item.currentStreak}
                          <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>
                            {item.currentStreak === 1 ? ' day' : ' days'}
                          </Text>
                        </Text>
                        <Text style={[styles.twoStreakStatus, { color: isDone ? colors.mint : colors.textSecondary }]}>
                          {isDone ? ' • Done ✓' : ` • ${item.hoursRemaining}h left`}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Right: Circular Check-In Button */}
                    <TouchableOpacity
                      style={[
                        styles.twoCircleButton,
                        isDone
                          ? { backgroundColor: colors.checkDoneBg, borderColor: colors.checkDoneBg }
                          : { backgroundColor: colors.checkPendingBg, borderColor: colors.checkPendingBorder },
                      ]}
                      onPress={() => handleCheckIn(item)}
                      activeOpacity={0.7}
                      disabled={isDone || isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={colors.flame} />
                      ) : isDone ? (
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      ) : (
                        <View style={[styles.twoInnerRingDot, { borderColor: colors.textSecondary }]} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Celebration Modal on Widget Check-In */}
      <StreakCelebrationModal
        visible={celebrationStreak.visible}
        streakName={celebrationStreak.name}
        streakCount={celebrationStreak.count}
        message={celebrationStreak.message || "Checked in directly from your widget! Streak extended! 🔥"}
        onClose={() => setCelebrationStreak((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyContainer: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  // Single Layout
  singleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  speechBubble: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  speechBubbleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerDateLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  singleContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  singleMascotCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleMascotImage: {
    width: 68,
    height: 68,
  },
  singleHabitName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  singleCounterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  singleCounterNumber: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  singleCounterUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  singleStatusCaption: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  singleCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#FF9600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  innerRingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  // Two Streaks Duolingo 4x2 Layout
  twoMainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  twoMascotStage: {
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  twoMascotImage: {
    width: 64,
    height: 64,
    marginTop: 4,
  },
  twoCardsColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  twoHabitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  twoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  twoMascotAvatar: {
    width: 32,
    height: 32,
    marginRight: 6,
  },
  speechBubbleMini: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  speechBubbleTextMini: {
    fontSize: 10,
    fontWeight: '700',
  },
  twoDivider: {
    height: 1,
    marginVertical: 6,
  },
  twoHabitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  twoHabitName: {
    fontSize: 14,
    fontWeight: '700',
  },
  twoStreakCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  twoStreakStatus: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 2,
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
    borderWidth: 2,
  },
  // Celebration Layout
  celebrationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  celebrationMascot: {
    width: 72,
    height: 72,
  },
  celebrationBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  celebrationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF9600',
    letterSpacing: 0.8,
  },
  celebrationTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  celebrationSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  celebrationTomorrow: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
