import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { StreakData } from '@/features/streaks/services/streakService';

interface WeeklyMonthlyReportCardProps {
  streaks: StreakData[];
  currentUserId?: string;
}

type ReportTab = 'daily' | 'weekly' | 'monthly';

export const WeeklyMonthlyReportCard: React.FC<WeeklyMonthlyReportCardProps> = ({
  streaks,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  let sky = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sky = useSky();
  } catch {}

  const skyConfig = sky?.skyConfig;
  const textPrimary = skyConfig?.textPrimary || colors.textPrimary;
  const textSecondary = skyConfig?.textSecondary || colors.textSecondary;
  const accentColor = skyConfig?.accent || colors.accent;
  const gradientColors: [string, string, ...string[]] = skyConfig
    ? skyConfig.skyGradient
    : [colors.skyStart, colors.skyMid, colors.skyEnd, colors.surface];

  const [activeTab, setActiveTab] = useState<ReportTab>('weekly');

  // Compute analytics
  const activeStreaks = useMemo(
    () => streaks.filter((s) => s.status !== 'broken' && s.status !== 'paused'),
    [streaks]
  );

  const brokenStreaksCount = useMemo(
    () => streaks.filter((s) => s.status === 'broken').length,
    [streaks]
  );

  const totalStreaksCount = streaks.length;

  // Calculate consistency percentage
  const consistencyScore = useMemo(() => {
    if (totalStreaksCount === 0) return 0;
    const ratio = activeStreaks.length / totalStreaksCount;
    return Math.round(ratio * 100);
  }, [activeStreaks.length, totalStreaksCount]);

  // Identify most natural vs least touched habits
  const { mostNaturalHabit, leastTouchedHabit } = useMemo(() => {
    if (streaks.length === 0) {
      return { mostNaturalHabit: null, leastTouchedHabit: null };
    }

    const sortedByStreak = [...streaks].sort((a, b) => b.currentStreak - a.currentStreak);
    const most = sortedByStreak[0];
    const least = sortedByStreak[sortedByStreak.length - 1];

    return {
      mostNaturalHabit: most,
      leastTouchedHabit: sortedByStreak.length > 1 ? least : null,
    };
  }, [streaks]);

  // Determine current day of week (0 = Sun, 1 = Mon ... 6 = Sat)
  const today = new Date();
  const todayDayIndex = today.getDay(); // 0 is Sunday, 1 is Monday

  // Generate 7 days of the week starting with Monday (Apple HIG calendar row)
  const weekDays = useMemo(() => {
    const days = [
      { label: 'MON', dayOffset: 1 },
      { label: 'TUE', dayOffset: 2 },
      { label: 'WED', dayOffset: 3 },
      { label: 'THU', dayOffset: 4 },
      { label: 'FRI', dayOffset: 5 },
      { label: 'SAT', dayOffset: 6 },
      { label: 'SUN', dayOffset: 0 },
    ];

    return days.map((d) => {
      const isToday = d.dayOffset === todayDayIndex;
      // If day is before today, it has active history
      const isCompleted = d.dayOffset <= (todayDayIndex === 0 ? 7 : todayDayIndex);
      return {
        ...d,
        isToday,
        isCompleted: activeStreaks.length > 0 && isCompleted,
      };
    });
  }, [todayDayIndex, activeStreaks.length]);

  // Whether the user is on track vs needs motivational rebound
  const hasStrongConsistency = consistencyScore >= 50 && activeStreaks.length > 0;

  return (
    <View style={[styles.cardContainer, { borderRadius: borderRadius.xxl }]}>
      {/* Living Atmospheric Sky Gradient */}
      <LinearGradient
        colors={gradientColors}
        locations={[0.0, 0.35, 0.70, 1.0]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.60 }}
        style={[styles.gradientBg, { borderRadius: borderRadius.xxl }]}
      />

      <View style={[styles.innerContent, { padding: spacing.xl }]}>
        {/* Header Tagline & Title */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.microLabel, styles.tagline]}>
              ✦ CONSISTENCY & PROGRESS
            </Text>
            <Text style={[typography.editorialTitle, styles.headerTitle]}>
              {activeTab === 'daily'
                ? 'Daily Habit Flow'
                : activeTab === 'weekly'
                ? 'Habit Rhythm: Mindful Week'
                : 'Long-Run Growth Journey'}
            </Text>
          </View>

          {/* Calming Atmosphere Badge */}
          <View style={styles.sparkleBadge}>
            <Ionicons
              name={skyConfig?.celestialBody === 'moon' ? 'moon' : 'sunny'}
              size={16}
              color="#FFFFFF"
            />
          </View>
        </View>

        {/* 7-Day Arc Week Calendar Wheel */}
        <View style={styles.weekCalendarRow}>
          {weekDays.map((day, index) => (
            <View key={index} style={styles.calendarDayCol}>
              <Text
                style={[
                  typography.badge,
                  styles.dayLabel,
                  day.isToday && styles.todayLabel,
                ]}
              >
                {day.label}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  day.isCompleted && styles.completedCircle,
                  day.isToday && styles.todayCircle,
                ]}
              >
                {day.isCompleted ? (
                  <Ionicons name="checkmark" size={12} color="#8B5CF6" />
                ) : (
                  <View style={[styles.emptyDot, day.isToday && styles.todayInnerDot]} />
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Apple HIG Segmented Control: [ Daily | Weekly | Monthly ] */}
        <View style={[styles.tabBar, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
          {(['daily', 'weekly', 'monthly'] as ReportTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  isSelected && styles.tabButtonActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    typography.caption,
                    styles.tabButtonText,
                    isSelected ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Consistency Metric Card */}
        <View style={[styles.statsSurface, { backgroundColor: skyConfig?.glassSurface || colors.surface, borderRadius: borderRadius.xl }]}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={[typography.caption, { color: textSecondary }]}>
                {activeTab === 'daily' ? 'Today’s Completion' : activeTab === 'weekly' ? 'Weekly Rhythm' : 'Monthly Consistency'}
              </Text>
              <Text style={[typography.statNumber, { color: textPrimary }]}>
                {streaks.length === 0 ? '0%' : `${consistencyScore}%`}
              </Text>
            </View>

            <View style={styles.scorePill}>
              <Ionicons
                name={hasStrongConsistency ? 'trending-up' : 'refresh-circle'}
                size={16}
                color={hasStrongConsistency ? colors.appleMint : colors.appleOrange}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: hasStrongConsistency ? colors.appleMint : colors.appleOrange,
                    fontWeight: '700',
                  },
                ]}
              >
                {hasStrongConsistency ? 'Compound Zone 🔥' : 'Reset & Rebound 🌱'}
              </Text>
            </View>
          </View>

          {/* Smooth Gradient Progress Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceSubtle }]}>
            <LinearGradient
              colors={[colors.celestialPeriwinkle, colors.celestialLavender, colors.appleMint]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill,
                { width: `${Math.max(8, consistencyScore)}%` },
              ]}
            />
          </View>

          {/* Quick Habit Insights */}
          <View style={styles.habitInsightsRow}>
            <View style={styles.insightItem}>
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                🌟 Most Natural
              </Text>
              <Text
                style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', marginTop: 2 }]}
                numberOfLines={1}
              >
                {mostNaturalHabit ? `${mostNaturalHabit.name} (${mostNaturalHabit.currentStreak}d)` : 'Start 1st habit'}
              </Text>
            </View>

            <View style={[styles.insightDivider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.insightItem}>
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                🎯 Needs Care
              </Text>
              <Text
                style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', marginTop: 2 }]}
                numberOfLines={1}
              >
                {leastTouchedHabit ? `${leastTouchedHabit.name} (${leastTouchedHabit.currentStreak}d)` : 'All balanced!'}
              </Text>
            </View>
          </View>

          {/* The Psychology Reward / Rebound Paragraph */}
          <View
            style={[
              styles.reflectionCard,
              {
                backgroundColor: hasStrongConsistency ? (skyConfig?.badgeBg || colors.surfaceSubtle) : 'rgba(254, 243, 199, 0.7)',
                borderColor: hasStrongConsistency ? (skyConfig?.accent || colors.appleMint) : colors.appleOrange,
              },
            ]}
          >
            <View style={styles.reflectionHeader}>
              <Ionicons
                name={hasStrongConsistency ? 'sparkles' : 'heart'}
                size={16}
                color={hasStrongConsistency ? accentColor : colors.appleOrange}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: hasStrongConsistency ? accentColor : colors.appleOrange,
                    fontWeight: '700',
                  },
                ]}
              >
                {hasStrongConsistency
                  ? 'Your Consistency Reward & Long-Run Impact'
                  : 'Gentle Rebound: Never Miss Twice'}
              </Text>
            </View>

            <Text
              style={[
                typography.bodySmall,
                {
                  color: textPrimary,
                  lineHeight: 22,
                  marginTop: 6,
                },
              ]}
            >
              {hasStrongConsistency
                ? activeTab === 'monthly'
                  ? 'A month of consistent choices does something extraordinary: it frees your mind from willpower exhaustion. When habits become second nature, discipline transforms into effortless identity. What felt heavy on day one is now your quiet superpower. Keep investing in this daily compound interest.'
                  : 'Every single day you check in, you are actively rewiring your neural pathways and reducing cognitive friction. Consistency is not about giant leaps—it is about relentless, gentle repetition. In the long run, this compound momentum is what turns fleeting motivation into an unbreakable foundation for life. You are living proof that small daily actions create monumental destinies.'
                : brokenStreaksCount > 0
                  ? `Never miss twice. You have ${brokenStreaksCount} paused or broken streak(s), but a skipped day is just a statistical blip—not a moral failure or a reset of your personal growth. The neural pathways you built didn’t vanish overnight. Take a breath, forgive the pause, and step right back in today. Your strongest comeback starts now.`
                  : 'Never miss twice. A skipped day is just a statistical blip, not a failure of character or a reset of your personal growth. The neural pathways you built didn’t vanish overnight. Every master has fallen off pace; what separates them is that they step back in immediately without shame. Take a breath, forgive the pause, and let today be the proud beginning of your longest run yet.'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  gradientBg: {
    ...StyleSheet.absoluteFill,
  },
  innerContent: {
    position: 'relative',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  sparkleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCalendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  calendarDayCol: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
  },
  todayLabel: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCircle: {
    backgroundColor: '#FFFFFF',
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  todayInnerDot: {
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  tabButtonText: {
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  tabButtonTextInactive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statsSurface: {
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 179, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  habitInsightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 12,
  },
  insightItem: {
    flex: 1,
  },
  insightDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  reflectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
