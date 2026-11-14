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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { useAuthStore } from '@/store/useAuthStore';
import { streakService, StreakData } from '@/features/streaks/services/streakService';
import { widgetService, WidgetStreakSnapshot } from '@/features/widget/widgetService';
import { InteractiveWidgetCard } from '@/features/widget/components/InteractiveWidgetCard';
import { LivingSkyBackground } from '@/components/motion/LivingSkyBackground';
import { Card, Button } from '@/components/common';

export default function WidgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { typography, spacing } = useTheme();
  const { skyConfig } = useSky();
  const { user } = useAuthStore();

  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [pinnedStreakIds, setPinnedStreakIds] = useState<string[]>([]);
  const [targetCapacity, setTargetCapacity] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = streakService.subscribeToUserStreaks(
      user.uid,
      async (userStreaks) => {
        setStreaks(userStreaks);
        const savedPins = await widgetService.getPinnedStreakIds();
        const capacityMode = await AsyncStorage.getItem('@streakmate/widget_capacity_mode');
        const valid = savedPins.filter((id) => userStreaks.some((s: StreakData) => s.id === id));

        if (capacityMode === '1') {
          // Explicitly 1 habit mode
          const single = valid.length > 0 ? [valid[0]] : userStreaks.length > 0 ? [userStreaks[0].id] : [];
          setPinnedStreakIds(single);
          setTargetCapacity(1);
          if (single.length > 0) {
            await widgetService.setPinnedStreakIds(single);
            await widgetService.syncToNativeWidget(userStreaks, user.uid);
          }
        } else if (userStreaks.length >= 2) {
          // Default: 2 Habits for 4x2 Duolingo widget
          let duo = valid.slice(0, 2);
          if (duo.length < 2) {
            const others = userStreaks.filter((s: StreakData) => !duo.includes(s.id));
            duo = [...duo, ...others.map((s: StreakData) => s.id)].slice(0, 2);
          }
          setPinnedStreakIds(duo);
          setTargetCapacity(2);
          await widgetService.setPinnedStreakIds(duo);
          await widgetService.syncToNativeWidget(userStreaks, user.uid);
        } else if (userStreaks.length === 1) {
          const single = [userStreaks[0].id];
          setPinnedStreakIds(single);
          setTargetCapacity(1);
          await widgetService.setPinnedStreakIds(single);
          await widgetService.syncToNativeWidget(userStreaks, user.uid);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Failed to load widget streaks:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const snapshots: WidgetStreakSnapshot[] = pinnedStreakIds
    .map((id) => streaks.find((s) => s.id === id))
    .filter((s): s is StreakData => Boolean(s && user))
    .map((s) => widgetService.buildSnapshot(s, user!.uid));

  const handleToggleStreak = async (id: string) => {
    let next: string[];
    if (targetCapacity === 1) {
      // In 1 Habit mode, tapping any streak immediately selects it
      next = [id];
    } else {
      // In 2 Habits mode:
      if (pinnedStreakIds.includes(id)) {
        if (pinnedStreakIds.length <= 1) {
          Alert.alert(
            'Keep 2 Habits',
            'In 2 Habits mode, please tap another habit below or switch to 1 Habit Mode.'
          );
          return;
        }
        next = pinnedStreakIds.filter((p) => p !== id);
      } else {
        if (pinnedStreakIds.length >= 2) {
          // Replace second habit
          next = [pinnedStreakIds[0], id];
        } else {
          next = [...pinnedStreakIds, id];
        }
      }
    }
    setPinnedStreakIds(next);
    await widgetService.setPinnedStreakIds(next);
    if (user?.uid) {
      await widgetService.syncToNativeWidget(streaks, user.uid);
    }
  };

  return (
    <LivingSkyBackground>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20) + 12,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
            backgroundColor: skyConfig.glassSurface,
            borderBottomColor: skyConfig.glassBorderBottom,
            borderBottomWidth: 1,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={skyConfig.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.title2, { color: skyConfig.textPrimary, fontWeight: '700' }]}>
          Interactive Widget
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle / Intro */}
        <Text style={[typography.bodyMedium, { color: skyConfig.textSecondary, marginBottom: spacing.lg }]}>
          Add the interactive widget to your Android or iOS home screen. Tap the button directly on your widget to save your streaks in one click without opening the app!
        </Text>

        {/* Live Interactive Widget Simulator */}
        <Text style={[typography.headline, { color: skyConfig.textPrimary, marginBottom: spacing.sm }]}>
          Live Widget Preview
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={skyConfig.accent} style={{ marginVertical: 32 }} />
        ) : (
          <InteractiveWidgetCard
            snapshots={snapshots}
            currentUserId={user?.uid || ''}
            onOpenDetails={(id) => router.push(`/streak/${id}`)}
          />
        )}

        {/* Habit Count Mode Selector (1 Habit vs 2 Habits) */}
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
          <Text style={[typography.headline, { color: skyConfig.textPrimary, marginBottom: spacing.xs }]}>
            Widget Layout Mode
          </Text>
          <Text style={[typography.caption, { color: skyConfig.textSecondary, marginBottom: spacing.sm }]}>
            Choose whether your home screen displays 1 hero habit with character art or 2 habits together:
          </Text>

          <View
            style={[
              styles.segmentContainer,
              {
                backgroundColor: skyConfig.isDarkContent
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(15, 23, 42, 0.35)',
                borderColor: skyConfig.glassBorderTop,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                targetCapacity === 1 && {
                  backgroundColor: skyConfig.accent,
                  shadowColor: skyConfig.accent,
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 2,
                },
              ]}
              activeOpacity={0.8}
              onPress={async () => {
                setTargetCapacity(1);
                await AsyncStorage.setItem('@streakmate/widget_capacity_mode', '1');
                if (pinnedStreakIds.length > 1) {
                  const next = [pinnedStreakIds[0]];
                  setPinnedStreakIds(next);
                  await widgetService.setPinnedStreakIds(next);
                  if (user?.uid) await widgetService.syncToNativeWidget(streaks, user.uid);
                }
              }}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={targetCapacity === 1 ? '#FFFFFF' : skyConfig.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: targetCapacity === 1 ? '#FFFFFF' : skyConfig.textPrimary,
                    fontWeight: '700',
                  },
                ]}
              >
                1 Habit (Hero Buddy)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                targetCapacity === 2 && {
                  backgroundColor: skyConfig.accent,
                  shadowColor: skyConfig.accent,
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 2,
                },
              ]}
              activeOpacity={0.8}
              onPress={async () => {
                setTargetCapacity(2);
                await AsyncStorage.setItem('@streakmate/widget_capacity_mode', '2');
                if (pinnedStreakIds.length === 1 && streaks.length > 1) {
                  const second = streaks.find((s) => s.id !== pinnedStreakIds[0]);
                  if (second) {
                    const next = [pinnedStreakIds[0], second.id];
                    setPinnedStreakIds(next);
                    await widgetService.setPinnedStreakIds(next);
                    if (user?.uid) await widgetService.syncToNativeWidget(streaks, user.uid);
                  }
                }
              }}
            >
              <Ionicons
                name="layers"
                size={16}
                color={targetCapacity === 2 ? '#FFFFFF' : skyConfig.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: targetCapacity === 2 ? '#FFFFFF' : skyConfig.textPrimary,
                    fontWeight: '700',
                  },
                ]}
              >
                2 Habits (Duo Rhythm)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Choose Streaks Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
          }}
        >
          <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
            {targetCapacity === 1 ? 'Select Your 1 Habit' : 'Select Your 2 Habits'}
          </Text>
          <View style={[styles.pillBadge, { backgroundColor: skyConfig.badgeBg }]}>
            <Text style={[typography.caption, { color: skyConfig.accent, fontWeight: '700' }]}>
              {pinnedStreakIds.length} of {targetCapacity} Selected
            </Text>
          </View>
        </View>

        {streaks.length === 0 && !loading && (
          <Card style={{ padding: spacing.lg, alignItems: 'center' }}>
            <Ionicons name="flame-outline" size={32} color={skyConfig.textMuted} />
            <Text style={[typography.bodyMedium, { color: skyConfig.textSecondary, marginTop: 8 }]}>
              No active streaks found. Create one first!
            </Text>
          </Card>
        )}

        {streaks.map((item) => {
          const isSelected = pinnedStreakIds.includes(item.id);
          const isCheckedIn = Boolean(user && item.currentPeriodCheckIns?.includes(user.uid));

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => handleToggleStreak(item.id)}
            >
              <Card
                style={[
                  styles.streakOptionCard,
                  {
                    borderColor: isSelected ? skyConfig.accent : skyConfig.glassBorderBottom,
                    borderWidth: isSelected ? 2 : 1,
                    backgroundColor: skyConfig.glassSurface,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[typography.caption, { color: skyConfig.textSecondary, marginTop: 2 }]}>
                    {item.currentStreak} Day Streak • {isCheckedIn ? 'Checked In Today' : 'Pending Check-In'}
                  </Text>
                </View>

                {isSelected ? (
                  <View style={[styles.checkCircle, { backgroundColor: skyConfig.accent }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={[styles.emptyCircle, { borderColor: skyConfig.textMuted }]} />
                )}
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Home Screen Instructions Box */}
        <View
          style={[
            styles.instructionsBox,
            {
              backgroundColor: skyConfig.badgeBg,
              borderColor: skyConfig.glassBorderTop,
              marginTop: spacing.xl,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="information-circle" size={20} color={skyConfig.accent} style={{ marginRight: 6 }} />
            <Text style={[typography.headline, { color: skyConfig.textPrimary, fontSize: 16 }]}>
              How to Add to Home Screen
            </Text>
          </View>
          <Text style={[typography.bodySmall, { color: skyConfig.textSecondary, lineHeight: 20 }]}>
            1. Long press on any empty space on your phone's Home Screen.{'\n'}
            2. Tap <Text style={{ fontWeight: '700' }}>Widgets</Text> and search for <Text style={{ fontWeight: '700' }}>StreakMate</Text>.{'\n'}
            3. Drag the widget to your home screen.{'\n'}
            4. Tap the widget button anytime to complete your daily check-in with 1 click!
          </Text>

          {pinnedStreakIds.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Button
                title="Simulate 1-Tap Home Screen Check-In"
                variant="secondary"
                size="sm"
                onPress={async () => {
                  if (!user) return;
                  const res = await widgetService.quickCheckIn(pinnedStreakIds[0], user.uid);
                  Alert.alert(res.success ? 'Success!' : 'Notice', res.message);
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </LivingSkyBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  streakOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 10,
    borderRadius: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  instructionsBox: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
});
