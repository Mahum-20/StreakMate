import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useSky } from '@/core/environment/SkyContext';
import { useTheme } from '@/core/theme';
import { widgetService } from '@/features/widget/widgetService';
import { streakService } from '@/features/streaks/services/streakService';
import { StreakCelebrationModal } from '@/components/modals/StreakCelebrationModal';
import { LivingSkyBackground } from '@/components/motion/LivingSkyBackground';

export default function WidgetCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { skyConfig } = useSky();
  const { typography } = useTheme();

  const [loading, setLoading] = useState(true);
  const [celebrationData, setCelebrationData] = useState<{
    visible: boolean;
    name: string;
    count: number;
    message?: string;
  }>({
    visible: false,
    name: '',
    count: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const performCheckIn = async () => {
      if (!user?.uid) {
        // Not authenticated: send to login
        router.replace('/(auth)/login');
        return;
      }

      if (!id || id === 'quick') {
        router.replace('/widget');
        return;
      }

      let targetStreakId: string | null = id;

      try {
        if (id === 'quick_1') {
          const pinnedIds = await widgetService.getPinnedStreakIds();
          targetStreakId = pinnedIds.length > 0 ? pinnedIds[0] : null;
        } else if (id === 'quick_2') {
          const pinnedIds = await widgetService.getPinnedStreakIds();
          targetStreakId = pinnedIds.length > 1 ? pinnedIds[1] : pinnedIds[0] || null;
        }

        if (!targetStreakId) {
          router.replace('/widget');
          return;
        }

        // Fetch streak details
        const streakData = await streakService.getStreak(targetStreakId);
        if (!streakData) {
          router.replace('/(tabs)');
          return;
        }

        // Submit check-in
        const res = await widgetService.quickCheckIn(targetStreakId, user.uid);
        widgetService.syncToNativeWidget([streakData], user.uid);

        if (isMounted) {
          setLoading(false);
          const isSolo = Boolean(
            streakData.isSolo ||
            (streakData.participantUids && streakData.participantUids.length === 1)
          );

          setCelebrationData({
            visible: true,
            name: streakData.name,
            count: res.allCompleted ? streakData.currentStreak + 1 : streakData.currentStreak,
            message: res.success
              ? isSolo
                ? "You completed today's streak! Momentum secured."
                : res.allCompleted
                ? "Both you and your friend have completed check-ins! Streak extended! 🔥"
                : "Your check-in is recorded! Nudge your friend to lock it in."
              : res.message,
          });
        }
      } catch (err) {
        console.warn('Widget check-in execution error:', err);
        if (isMounted) {
          router.replace('/(tabs)');
        }
      }
    };

    performCheckIn();

    return () => {
      isMounted = false;
    };
  }, [id, user?.uid]);

  const handleCloseCelebration = () => {
    setCelebrationData((prev) => ({ ...prev, visible: false }));
    router.replace('/(tabs)');
  };

  return (
    <LivingSkyBackground>
      <View style={styles.centerContainer}>
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={skyConfig.accent} />
            <Text
              style={[
                typography.headline,
                { color: skyConfig.textPrimary, marginTop: 16, fontSize: 16 },
              ]}
            >
              Checking in from widget...
            </Text>
          </View>
        )}

        <StreakCelebrationModal
          visible={celebrationData.visible}
          streakName={celebrationData.name}
          streakCount={celebrationData.count}
          message={celebrationData.message}
          onClose={handleCloseCelebration}
        />
      </View>
    </LivingSkyBackground>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
