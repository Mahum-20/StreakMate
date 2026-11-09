import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar, EmptyState, Card, Button } from '@/components/common';
import { StreakCard, StatCard } from '@/components/cards';
import { ConfettiCelebration } from '@/components/motion/ConfettiCelebration';
import { LivingSkyBackground } from '@/components/motion/LivingSkyBackground';
import { streakService, StreakData } from '@/features/streaks/services/streakService';
import { nudgeService, NudgeRecord } from '@/features/streaks/services/nudgeService';
import { calculatePeriodKey, getEndOfDay } from '@/core/utils/streakLogic';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const { skyConfig } = useSky();
  const { user } = useAuthStore();

  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [incomingNudges, setIncomingNudges] = useState<NudgeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribeStreaks = streakService.subscribeToUserStreaks(
      user.uid,
      (liveStreaks) => {
        setStreaks(liveStreaks);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn('Live streaks subscription notice:', err);
        setLoading(false);
        setRefreshing(false);
      }
    );

    const unsubscribeNudges = nudgeService.subscribeToIncomingNudges(
      user.uid,
      (nudges) => {
        setIncomingNudges(nudges);
      }
    );

    return () => {
      unsubscribeStreaks();
      unsubscribeNudges();
    };
  }, [user?.uid]);

  // Aggregate incoming nudges from both streak documents (guaranteed real-time) and standalone records
  const activeNudges: NudgeRecord[] = useMemo(() => {
    if (!user?.uid) return [];
    const map = new Map<string, NudgeRecord>();

    // 1. Standalone collection records
    incomingNudges.forEach((n) => map.set(n.streakId, n));

    // 2. Authoritative real-time streak documents (fallback that guarantees delivery)
    streaks.forEach((s) => {
      if (
        s.lastNudgeAt &&
        s.lastNudgeBy &&
        s.lastNudgeBy !== user.uid &&
        !(s as any).lastNudgeDismissed
      ) {
        let isRecent = true;
        try {
          const nudgeMs = (s.lastNudgeAt as any).toMillis ? (s.lastNudgeAt as any).toMillis() : Date.now();
          isRecent = Date.now() - nudgeMs < 1000 * 60 * 60 * 24;
        } catch {}

        if (isRecent) {
          const friendName = (s.participantNames && s.participantNames[s.lastNudgeBy]) || 'Friend';
          map.set(s.id, {
            id: `streak_${s.id}`,
            streakId: s.id,
            streakName: s.name,
            fromUid: s.lastNudgeBy,
            fromName: friendName,
            toUid: user.uid,
            toName: user.displayName || 'You',
            phrase: s.lastNudgePhrase || 'Your friend nudged you to check in!',
            read: false,
            createdAt: s.lastNudgeAt,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [incomingNudges, streaks, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const handleCheckIn = async (streakId: string) => {
    if (!user?.uid) return;
    try {
      await streakService.submitCheckIn(streakId, user.uid);
      setShowConfetti(true);
    } catch (err) {
      console.warn('Check-in error:', err);
    }
  };

  // Helper to extract friend info and remaining hours
  const formatStreakCard = (streak: StreakData) => {
    const isSolo = Boolean(streak.isSolo || (streak.participantUids && streak.participantUids.length === 1));
    const friendUid = streak.participantUids.find((uid) => uid !== user?.uid) || '';
    const friendName = isSolo ? 'Solo Habit' : (streak.participantNames?.[friendUid] || 'Friend');
    const friendAvatar = isSolo ? null : (streak.participantAvatars ? streak.participantAvatars[friendUid] : null);

    const tz = streak.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayKey = calculatePeriodKey(new Date(), tz);
    const isCurrentDay = streak.currentPeriodKey === todayKey;

    // Only count check-ins that occurred during TODAY's calendar period!
    const activeCheckIns = isCurrentDay ? (streak.currentPeriodCheckIns || []) : [];
    const userCheckedIn = user?.uid ? activeCheckIns.includes(user.uid) : false;
    const friendCheckedIn = isSolo ? true : (friendUid ? activeCheckIns.includes(friendUid) : false);

    // End of day is always 23:59:59 of today in the user's timezone!
    const now = Date.now();
    const endOfDayMillis = getEndOfDay(new Date()).getTime();
    const hoursRemaining = Math.max(0, Math.floor((endOfDayMillis - now) / (1000 * 60 * 60)));

    return {
      isSolo,
      friendName,
      friendAvatar,
      userCheckedIn,
      friendCheckedIn,
      hoursRemaining,
    };
  };

  // Group streaks
  const atRiskStreaks = useMemo(() => {
    return streaks.filter((s) => {
      if (s.status === 'broken' || s.status === 'paused') return false;
      const { userCheckedIn, hoursRemaining } = formatStreakCard(s);
      return s.status === 'at_risk' || (hoursRemaining <= 3 && !userCheckedIn);
    });
  }, [streaks, user?.uid]);

  const normalStreaks = useMemo(() => {
    return streaks.filter((s) => !atRiskStreaks.some((ar) => ar.id === s.id));
  }, [streaks, atRiskStreaks]);

  // Statistics calculation
  const activeCount = useMemo(() => {
    return streaks.filter((s) => s.status !== 'broken' && s.status !== 'paused').length;
  }, [streaks]);

  const savedTodayCount = useMemo(() => {
    return streaks.filter((s) => {
      const tz = s.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const todayKey = calculatePeriodKey(new Date(), tz);
      if (s.currentPeriodKey !== todayKey) return false;
      return s.currentPeriodCheckIns.length >= s.participantUids.length && s.participantUids.length > 0;
    }).length;
  }, [streaks]);

  const longestRecord = useMemo(() => {
    if (streaks.length === 0) return 0;
    return Math.max(...streaks.map((s) => s.longestStreak || 0), 0);
  }, [streaks]);

  // Responsive width for 3 sliding cards so Card 3 is half cut on the right edge
  const statCardWidth = useMemo(() => {
    return Math.round((SCREEN_WIDTH - 44) / 2.5);
  }, []);

  return (
    <LivingSkyBackground>
      {/* Top Translucent Floating Header with generous breathing space */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.lg,
            backgroundColor: skyConfig.glassSurface,
            borderBottomColor: skyConfig.glassBorderBottom,
            borderBottomWidth: 1,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.8}
        >
          <Avatar
            name={user?.displayName || 'User'}
            imageUrl={user?.photoURL}
            size={46}
          />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={[typography.title2, { color: skyConfig.textPrimary, fontWeight: '700' }]} numberOfLines={1}>
              {user?.displayName || 'StreakMate'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Incoming Nudges from Friends (Duolingo Style) */}
        {activeNudges.length > 0 && (
          <View style={{ marginTop: spacing.base, marginBottom: spacing.xs }}>
            {activeNudges.map((nudge) => (
              <Card
                key={nudge.id}
                style={[
                  styles.nudgeBanner,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.accent,
                    borderWidth: 1.5,
                    marginBottom: spacing.sm,
                  },
                ]}
              >
                <View style={styles.nudgeBannerTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="flash" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
                      {nudge.fromName} Nudged You! ⚡
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => nudgeService.markNudgeRead(nudge.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontStyle: 'italic', marginVertical: 6 }]}>
                  "{nudge.phrase}"
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                  <Button
                    title="Check In Now"
                    variant="primary"
                    size="sm"
                    onPress={() => {
                      nudgeService.markNudgeRead(nudge.id);
                      router.push(`/streak/${nudge.streakId}`);
                    }}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Horizontal Sliding Statistics Carousel: 3rd card is half-cut to encourage sliding */}
        <View style={{ marginTop: activeNudges.length > 0 ? spacing.sm : spacing.base, marginBottom: spacing.lg }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            style={{ marginHorizontal: -spacing.xl }}
          >
            <StatCard
              label="Active Streaks"
              value={activeCount}
              icon="flame"
              color={colors.accent}
              style={{ width: statCardWidth, marginLeft: spacing.xl, marginRight: spacing.md }}
            />
            <StatCard
              label="Checked In"
              value={savedTodayCount}
              icon="shield-checkmark"
              color={colors.success}
              style={{ width: statCardWidth, marginRight: spacing.md }}
            />
            <StatCard
              label="Longest Streak"
              value={`${longestRecord}d`}
              icon="trophy"
              color={colors.warning}
              style={{ width: statCardWidth, marginRight: spacing.xl }}
            />
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <>
            {/* At-Risk Streaks Alert Section */}
            {atRiskStreaks.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="time" size={18} color={colors.warning} style={{ marginRight: 6 }} />
                    <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
                      Needs Attention
                    </Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.warning, fontWeight: '600' }]}>
                    {atRiskStreaks.length} Expiring Soon
                  </Text>
                </View>

                {atRiskStreaks.map((streak) => {
                  const card = formatStreakCard(streak);
                  return (
                    <StreakCard
                      key={streak.id}
                      id={streak.id}
                      name={streak.name}
                      friendName={card.friendName}
                      friendAvatarUrl={card.friendAvatar}
                      currentStreak={streak.currentStreak}
                      status={streak.status}
                      hoursRemaining={card.hoursRemaining}
                      userCheckedIn={card.userCheckedIn}
                      friendCheckedIn={card.friendCheckedIn}
                      onPress={() => router.push(`/streak/${streak.id}`)}
                      onCheckIn={() => handleCheckIn(streak.id)}
                    />
                  );
                })}
              </View>
            )}

            {/* Active Streaks Section */}
            {normalStreaks.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
                    Active Streaks
                  </Text>
                  <Text style={[typography.caption, { color: skyConfig.textSecondary }]}>
                    {normalStreaks.length} Ongoing
                  </Text>
                </View>

                {normalStreaks.map((streak) => {
                  const card = formatStreakCard(streak);
                  return (
                    <StreakCard
                      key={streak.id}
                      id={streak.id}
                      name={streak.name}
                      friendName={card.friendName}
                      friendAvatarUrl={card.friendAvatar}
                      currentStreak={streak.currentStreak}
                      status={streak.status}
                      hoursRemaining={card.hoursRemaining}
                      userCheckedIn={card.userCheckedIn}
                      friendCheckedIn={card.friendCheckedIn}
                      onPress={() => router.push(`/streak/${streak.id}`)}
                      onCheckIn={() => handleCheckIn(streak.id)}
                    />
                  );
                })}
              </>
            )}

            {/* Zero State if no streaks in database */}
            {streaks.length === 0 && (
              <EmptyState
                icon="flame-outline"
                title="No Active Streaks Yet"
                description="Accountability works best together. Pick a habit and invite a friend to build a streak!"
                actionTitle="Start Your First Streak"
                onActionPress={() => router.push('/streak/create')}
                style={{ marginTop: spacing.xl }}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) for New Habit in bottom right corner */}
      <TouchableOpacity
        onPress={() => router.push('/streak/create')}
        style={[
          styles.fabButton,
          {
            backgroundColor: skyConfig.accent,
            shadowColor: skyConfig.accent,
          },
        ]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create New Habit"
      >
        <Ionicons name="add" size={32} color={skyConfig.accentForeground} />
      </TouchableOpacity>

      {/* Confetti Celebration Motion Graphics on Check-in */}
      <ConfettiCelebration
        visible={showConfetti}
        onFinish={() => setShowConfetti(false)}
      />
    </LivingSkyBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabButton: {
    position: 'absolute',
    bottom: 86,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statsScrollContent: {
    paddingVertical: 4,
  },
  nudgeBanner: {
    padding: 14,
  },
  nudgeBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
