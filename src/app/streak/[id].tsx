import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar, Card, Badge, Button, EmptyState } from '@/components/common';
import { streakService, StreakData } from '@/features/streaks/services/streakService';
import { nudgeService } from '@/features/streaks/services/nudgeService';
import { ConfettiCelebration } from '@/components/motion/ConfettiCelebration';
import { StreakCelebrationModal } from '@/components/modals/StreakCelebrationModal';
import { LivingSkyBackground } from '@/components/motion/LivingSkyBackground';
import { calculatePeriodKey, getEndOfDay } from '@/core/utils/streakLogic';

export default function StreakDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { skyConfig } = useSky();
  const { user } = useAuthStore();

  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [nudgedRecently, setNudgedRecently] = useState(false);
  const [sendingNudge, setSendingNudge] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = streakService.subscribeToStreak(
      id,
      (data) => {
        setStreak(data);
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching streak detail:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Check if current user already nudged their partner recently (within 1 hour)
  useEffect(() => {
    if (streak?.lastNudgeAt && streak.lastNudgeBy === user?.uid) {
      const nudgeMs = streak.lastNudgeAt.toMillis();
      if (Date.now() - nudgeMs < 1000 * 60 * 60) {
        setNudgedRecently(true);
      }
    }
  }, [streak?.lastNudgeAt, streak?.lastNudgeBy, user?.uid]);

  // Derived friend and check-in statuses
  const isSolo = Boolean(streak?.isSolo || (streak?.participantUids && streak.participantUids.length === 1));
  const friendUid = streak?.participantUids.find((uid) => uid !== user?.uid) || '';
  const friendName = (streak && streak.participantNames && streak.participantNames[friendUid]) || 'Friend';
  const friendAvatarUrl = streak?.participantAvatars?.[friendUid] || null;

  const tz = streak?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = calculatePeriodKey(new Date(), tz);
  const isCurrentDay = streak?.currentPeriodKey === todayKey;

  const activeCheckIns = isCurrentDay ? (streak?.currentPeriodCheckIns || []) : [];
  const userCheckedIn = Boolean(user && activeCheckIns.includes(user.uid));
  const friendCheckedIn = Boolean(friendUid && activeCheckIns.includes(friendUid));

  // Compute hours remaining until midnight in streak timezone
  const now = Date.now();
  const endOfDayMillis = getEndOfDay(new Date()).getTime();
  const hoursRemaining = Math.max(0, Math.floor((endOfDayMillis - now) / (1000 * 60 * 60)));

  const createdAtFormatted = streak?.createdAt
    ? streak.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';

  const handleCheckIn = async () => {
    if (!streak || !user || checkingIn) return;
    setCheckingIn(true);
    try {
      const result = await streakService.submitCheckIn(streak.id, user.uid);
      setShowConfetti(true);
      if (result.earnedFreeze) {
        setCelebrationMessage(
          `🎉 20-Day Milestone reached! You earned +1 Streak Freeze 🧊 (${result.freezesRemaining} total)!`
        );
      } else {
        setCelebrationMessage(
          isSolo
            ? "You completed today's streak! Fantastic work maintaining consistency."
            : result.allCompleted
            ? "Both you and your friend have completed check-ins! Streak extended! 🔥"
            : "Your check-in is saved! Ping your friend to lock in today's streak."
        );
      }
      setShowCelebration(true);
    } catch (err: any) {
      console.warn('Check-in error:', err);
      Alert.alert('Check-In Failed', err?.message || 'Could not register check-in.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleRandomNudge = async () => {
    if (!streak || !user || !friendUid || sendingNudge) return;
    setSendingNudge(true);
    try {
      await nudgeService.sendNudge({
        streakId: streak.id,
        streakName: streak.name,
        fromUid: user.uid,
        fromName: user.displayName || 'StreakMate Partner',
        toUid: friendUid,
        toName: friendName,
      });
      setNudgedRecently(true);
    } catch (err: any) {
      console.warn('Nudge delivery notice:', err?.message || err);
    } finally {
      setSendingNudge(false);
    }
  };

  const handleTogglePause = () => {
    if (!streak) return;

    if (streak.status === 'paused') {
      Alert.alert(
        'Resume Streak',
        'Would you like to resume this streak and reactivate daily accountability?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Resume',
            onPress: async () => {
              try {
                await streakService.resumeStreak(streak.id);
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to resume streak.');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Pause Streak',
        'Pausing freezes your streak counter while you take a planned break.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pause',
            onPress: async () => {
              try {
                await streakService.pauseStreak(streak.id);
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to pause streak.');
              }
            },
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!streak) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <EmptyState
          icon="alert-circle-outline"
          title="Streak Not Found"
          description="This streak may have been removed or does not exist."
          actionTitle="Back to Dashboard"
          onActionPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <LivingSkyBackground>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, spacing.base) + 4,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.md,
            backgroundColor: skyConfig.glassSurface,
            borderBottomColor: skyConfig.glassBorderBottom,
            borderBottomWidth: 1,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={skyConfig.textPrimary} />
        </TouchableOpacity>

        <Text style={[typography.title3, { color: skyConfig.textPrimary, fontWeight: '700' }]} numberOfLines={1}>
          Streak Details
        </Text>

        <TouchableOpacity
          onPress={handleTogglePause}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Streak options"
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={skyConfig.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={[typography.title1, { color: skyConfig.textPrimary }]} numberOfLines={2}>
                {streak.name}
              </Text>
              {streak.description ? (
                <Text style={[typography.bodyMedium, { color: skyConfig.textSecondary, marginTop: 4 }]}>
                  {streak.description}
                </Text>
              ) : null}
              <Text style={[typography.caption, { color: skyConfig.textMuted, marginTop: 4 }]}>
                Started {createdAtFormatted}
              </Text>
            </View>
            <Badge
              label={
                streak.status === 'active'
                  ? 'Active'
                  : streak.status === 'paused'
                  ? 'Paused'
                  : streak.status === 'frozen'
                  ? 'Frozen'
                  : streak.status === 'broken'
                  ? 'Broken'
                  : 'At Risk'
              }
              variant={
                streak.status === 'active'
                  ? 'active'
                  : streak.status === 'paused'
                  ? 'neutral'
                  : streak.status === 'broken'
                  ? 'broken'
                  : 'at_risk'
              }
            />
          </View>

          {/* Flame Counter display */}
          <View style={[styles.counterBox, { backgroundColor: skyConfig.badgeBg, borderRadius: borderRadius.lg }]}>
            <Ionicons name="flame" size={48} color={skyConfig.accent} />
            <Text style={[typography.display, { color: skyConfig.textPrimary, marginLeft: spacing.sm }]}>
              {streak.currentStreak}
            </Text>
            <Text style={[typography.caption, { color: skyConfig.textSecondary, marginLeft: 6, alignSelf: 'flex-end', marginBottom: 8 }]}>
              days continuous
            </Text>
          </View>

          {/* Stats Bar */}
          <View style={[styles.statsBar, { borderTopColor: skyConfig.glassBorderBottom, borderTopWidth: 1, paddingTop: spacing.md }]}>
            <View style={styles.statCol}>
              <Text style={[typography.caption, { color: skyConfig.textSecondary }]}>Longest Streak</Text>
              <Text style={[typography.headline, { color: skyConfig.textPrimary, marginTop: 2 }]}>
                {streak.longestStreak} Days
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[typography.caption, { color: skyConfig.textSecondary }]}>Time Left</Text>
              <Text style={[typography.headline, { color: hoursRemaining <= 3 ? colors.warning : skyConfig.textPrimary, marginTop: 2 }]}>
                {hoursRemaining} Hours
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[typography.caption, { color: skyConfig.textSecondary }]}>Freezes</Text>
              <Text style={[typography.headline, { color: skyConfig.textPrimary, marginTop: 2 }]}>
                {streak.freezesRemaining ?? 0} Left
              </Text>
            </View>
          </View>
        </Card>

        {/* Check-In Status */}
        <Text style={[typography.headline, { color: skyConfig.textPrimary, marginBottom: spacing.sm }]}>
          Today's Participation
        </Text>
        <Card style={{ marginBottom: spacing.lg }}>
          {/* User row */}
          <View style={styles.participantRow}>
            <Avatar name={user?.displayName || 'You'} imageUrl={user?.photoURL} size={40} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>You</Text>
              <Text style={[typography.caption, { color: userCheckedIn ? colors.success : colors.warning }]}>
                {userCheckedIn ? 'Checked in today' : 'Check-in pending'}
              </Text>
            </View>
            <Ionicons
              name={userCheckedIn ? 'checkmark-circle' : 'time-outline'}
              size={24}
              color={userCheckedIn ? colors.success : colors.textMuted}
            />
          </View>

          {/* Friend row (only for shared streaks) */}
          {!isSolo && (
            <View
              style={[
                styles.participantRow,
                {
                  borderTopColor: colors.borderSubtle,
                  borderTopWidth: 1,
                  paddingTop: spacing.md,
                  marginTop: spacing.md,
                },
              ]}
            >
              <Avatar name={friendName} imageUrl={friendAvatarUrl} size={40} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
                  {friendName}
                </Text>
                <Text style={[typography.caption, { color: friendCheckedIn ? colors.success : colors.warning }]}>
                  {friendCheckedIn ? 'Checked in today' : 'Check-in pending'}
                </Text>
              </View>
              <Ionicons
                name={friendCheckedIn ? 'checkmark-circle' : 'time-outline'}
                size={24}
                color={friendCheckedIn ? colors.success : colors.textMuted}
              />
            </View>
          )}
        </Card>

        {/* Action Button */}
        {!userCheckedIn ? (
          <Button
            title="Complete Today's Check-In"
            variant="primary"
            size="lg"
            loading={checkingIn}
            onPress={handleCheckIn}
            icon={<Ionicons name="checkmark-circle" size={20} color={colors.accentForeground} />}
            style={{ marginBottom: spacing.lg }}
          />
        ) : (
          <View style={{ marginBottom: spacing.xl }}>
            <View
              style={[
                styles.completedBanner,
                {
                  backgroundColor: colors.successMuted,
                  borderColor: colors.success,
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  marginBottom: !isSolo && !friendCheckedIn ? spacing.md : 0,
                },
              ]}
            >
              <Ionicons name="checkmark-done-circle" size={20} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={[typography.bodyMedium, { color: colors.success, fontWeight: '600' }]}>
                {isSolo || friendCheckedIn
                  ? 'Check-In Completed'
                  : `Checked in. Waiting for ${friendName.split(' ')[0]}.`}
              </Text>
            </View>

            {/* Duolingo-style Automatic Random Nudge Button (No Emojis) */}
            {!isSolo && !friendCheckedIn && (
              <Button
                title={nudgedRecently ? `Nudge Sent to ${friendName.split(' ')[0]}` : `Nudge ${friendName.split(' ')[0]}`}
                variant={nudgedRecently ? 'outline' : 'primary'}
                size="lg"
                disabled={nudgedRecently}
                loading={sendingNudge}
                onPress={handleRandomNudge}
                icon={<Ionicons name="notifications-outline" size={20} color={nudgedRecently ? skyConfig.accent : '#FFFFFF'} />}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Confetti Celebration on Check-in */}
      <ConfettiCelebration
        visible={showConfetti}
        onFinish={() => setShowConfetti(false)}
      />

      {/* Themed Celebration Modal on Check-in */}
      {streak && (
        <StreakCelebrationModal
          visible={showCelebration}
          streakName={streak.name}
          streakCount={streak.currentStreak}
          message={celebrationMessage}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </LivingSkyBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    width: '100%',
    marginTop: 16,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginVertical: 16,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
