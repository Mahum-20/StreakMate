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
        const valid = savedPins.filter((id) => userStreaks.some((s: StreakData) => s.id === id));
        if (valid.length > 0) {
          setPinnedStreakIds(valid);
          await widgetService.syncToNativeWidget(userStreaks, user.uid);
        } else if (userStreaks.length > 0) {
          const defaultPins = [userStreaks[0].id];
          setPinnedStreakIds(defaultPins);
          await widgetService.setPinnedStreakIds(defaultPins);
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
    if (pinnedStreakIds.includes(id)) {
      if (pinnedStreakIds.length <= 1) {
        Alert.alert('Notice', 'At least 1 streak must remain pinned to your widget.');
        return;
      }
      next = pinnedStreakIds.filter((p) => p !== id);
    } else {
      if (pinnedStreakIds.length >= 2) {
        // Shift oldest out to keep max 2 streaks
        next = [pinnedStreakIds[1], id];
      } else {
        next = [...pinnedStreakIds, id];
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

        {/* Choose 1 or 2 Streaks To Pin */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm }}>
          <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
            Select 1 or 2 Streaks
          </Text>
          <View style={[styles.pillBadge, { backgroundColor: skyConfig.badgeBg }]}>
            <Text style={[typography.caption, { color: skyConfig.accent, fontWeight: '700' }]}>
              {pinnedStreakIds.length} of 2 Selected
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
});
