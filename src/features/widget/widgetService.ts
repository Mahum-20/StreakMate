import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { streakService, StreakData } from '@/features/streaks/services/streakService';
import { calculatePeriodKey, getEndOfDay } from '@/core/utils/streakLogic';

const { StreakWidgetModule } = NativeModules;

const WIDGET_PINNED_STREAK_KEY = '@streakmate/pinned_widget_streak_id';
const WIDGET_PINNED_STREAKS_KEY = '@streakmate/pinned_widget_streak_ids';

export interface WidgetStreakSnapshot {
  id: string;
  name: string;
  currentStreak: number;
  userCheckedIn: boolean;
  friendCheckedIn: boolean;
  friendName: string;
  hoursRemaining: number;
  timeRemainingText: string;
  status: 'active' | 'at_risk' | 'broken' | 'paused' | 'frozen';
  isSolo: boolean;
}

export const widgetService = {
  /**
   * Retrieves the IDs of the streaks pinned to the interactive widget (up to 2).
   */
  async getPinnedStreakIds(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(WIDGET_PINNED_STREAKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 2);
        }
      }
      // Fallback to legacy single key
      const single = await AsyncStorage.getItem(WIDGET_PINNED_STREAK_KEY);
      return single ? [single] : [];
    } catch {
      return [];
    }
  },

  /**
   * Pins 1 or 2 specific streaks to the interactive widget.
   */
  async setPinnedStreakIds(streakIds: string[]): Promise<void> {
    try {
      const limited = streakIds.slice(0, 2);
      await AsyncStorage.setItem(WIDGET_PINNED_STREAKS_KEY, JSON.stringify(limited));
      if (limited.length > 0) {
        await AsyncStorage.setItem(WIDGET_PINNED_STREAK_KEY, limited[0]);
      }
    } catch (e) {
      console.warn('Failed to save pinned widget streak ids:', e);
    }
  },

  /**
   * Legacy helper for retrieving the primary pinned streak ID.
   */
  async getPinnedStreakId(): Promise<string | null> {
    const ids = await this.getPinnedStreakIds();
    return ids.length > 0 ? ids[0] : null;
  },

  /**
   * Legacy helper for setting the primary pinned streak ID.
   */
  async setPinnedStreakId(streakId: string): Promise<void> {
    await this.setPinnedStreakIds([streakId]);
  },

  /**
   * Produces a clean deep link that native Android home screen widgets or shortcuts can invoke.
   */
  getDeepLinkUrl(streakId: string): string {
    return `streakmate://checkin/${streakId}`;
  },

  /**
   * Resolves snapshot data for the widget given a user and active streaks.
   */
  buildSnapshot(streak: StreakData, userId: string): WidgetStreakSnapshot {
    const isSolo = Boolean(streak.isSolo || (streak.participantUids && streak.participantUids.length === 1));
    const friendUid = streak.participantUids?.find((uid) => uid !== userId) || '';
    const friendName = (streak.participantNames && streak.participantNames[friendUid]) || (isSolo ? 'Solo Rhythm' : 'Partner');

    const tz = streak.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayKey = calculatePeriodKey(new Date(), tz);
    const isCurrentDay = streak.currentPeriodKey === todayKey;

    const activeCheckIns = isCurrentDay ? (streak.currentPeriodCheckIns || []) : [];
    const userCheckedIn = Boolean(activeCheckIns.includes(userId));
    const friendCheckedIn = Boolean(friendUid && activeCheckIns.includes(friendUid));

    const now = Date.now();
    const endOfDayMillis = streak.currentPeriodEnd
      ? (streak.currentPeriodEnd.toDate ? streak.currentPeriodEnd.toDate().getTime() : getEndOfDay(new Date(), tz).getTime())
      : getEndOfDay(new Date(), tz).getTime();
    const remainingMinutes = Math.max(0, Math.floor((endOfDayMillis - now) / (1000 * 60)));
    const hoursRemaining = Math.max(0, Math.ceil(remainingMinutes / 60));
    const timeRemainingText = remainingMinutes < 60 ? `${remainingMinutes}m` : `${hoursRemaining}h`;

    return {
      id: streak.id,
      name: streak.name,
      currentStreak: streak.currentStreak,
      userCheckedIn,
      friendCheckedIn,
      friendName,
      hoursRemaining,
      timeRemainingText,
      status: streak.status,
      isSolo,
    };
  },

  /**
   * Performs an instant one-tap check-in directly for the interactive widget
   * without needing to open the full streak screen.
   */
  async quickCheckIn(
    streakId: string,
    userId: string
  ): Promise<{
    success: boolean;
    allCompleted: boolean;
    message: string;
    earnedFreeze?: boolean;
    freezesRemaining?: number;
  }> {
    try {
      const result = await streakService.submitCheckIn(streakId, userId);
      return {
        success: true,
        allCompleted: result.allCompleted,
        earnedFreeze: result.earnedFreeze,
        freezesRemaining: result.freezesRemaining,
        message: result.allCompleted ? 'Streak saved for today!' : 'Your check-in is recorded!',
      };
    } catch (err: any) {
      return {
        success: false,
        allCompleted: false,
        message: err?.message || 'Check-in failed.',
      };
    }
  },

  /**
   * Syncs the current pinned streaks directly into native Android SharedPreferences
   * and triggers an immediate AppWidget refresh so the home screen widget displays
   * real habit names, real counts, and matching check-in status.
   */
  async syncToNativeWidget(streaks: StreakData[], userId: string): Promise<void> {
    try {
      if (Platform.OS !== 'android' || !StreakWidgetModule?.updateWidgetData) {
        return;
      }

      let pinnedIds = await this.getPinnedStreakIds();
      const capacityMode = await AsyncStorage.getItem('@streakmate/widget_capacity_mode');

      // Keep only valid streak IDs that still exist in user's active streaks
      pinnedIds = pinnedIds.filter((id) => streaks.some((s) => s.id === id));

      // In 4x2 Duolingo widget mode, if user has >= 2 streaks and hasn't explicitly
      // locked mode to 1 habit ('1'), automatically pin top 2 streaks!
      if (capacityMode !== '1' && streaks.length >= 2) {
        if (pinnedIds.length < 2) {
          const remaining = streaks.filter((s) => !pinnedIds.includes(s.id));
          pinnedIds = [...pinnedIds, ...remaining.map((s) => s.id)].slice(0, 2);
          await this.setPinnedStreakIds(pinnedIds);
        }
      } else if (pinnedIds.length === 0 && streaks.length > 0) {
        pinnedIds = [streaks[0].id];
        await this.setPinnedStreakIds(pinnedIds);
      }

      const pinnedStreaks = pinnedIds
        .map((id) => streaks.find((s) => s.id === id))
        .filter((s): s is StreakData => Boolean(s));

      const payload = {
        streaks: pinnedStreaks.map((s) => {
          const snap = this.buildSnapshot(s, userId);
          return {
            id: snap.id,
            name: snap.name,
            currentStreak: snap.currentStreak,
            userCheckedIn: snap.userCheckedIn,
            friendCheckedIn: snap.friendCheckedIn,
            friendName: snap.friendName,
            hoursRemaining: snap.hoursRemaining,
            timeRemainingText: snap.timeRemainingText,
            status: snap.status,
            isSolo: snap.isSolo,
          };
        }),
      };

      StreakWidgetModule.updateWidgetData(JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to sync widget data to native Android:', err);
    }
  },

  /**
   * Processes any pending offline or instant home screen check-ins recorded
   * by the native widget BroadcastReceiver and synchronizes them to Firestore.
   * Only acknowledges and removes successfully submitted actions; failed
   * actions are preserved in the queue for retry.
   */
  async processPendingWidgetCheckIns(userId: string): Promise<void> {
    if (Platform.OS !== 'android' || !StreakWidgetModule?.getPendingCheckIns) {
      return;
    }

    try {
      const raw = await StreakWidgetModule.getPendingCheckIns();
      if (!raw || raw === '[]') return;

      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        const completedActionIds: string[] = [];

        for (const item of list) {
          if (item?.streakId) {
            try {
              await streakService.submitCheckIn(item.streakId, userId, item.actionId);
              if (item.actionId) {
                completedActionIds.push(item.actionId);
              }
            } catch (checkErr) {
              console.warn('Pending widget check-in retry preserved:', checkErr);
            }
          }
        }

        if (completedActionIds.length > 0) {
          if (StreakWidgetModule.removeCompletedPendingCheckIns) {
            await StreakWidgetModule.removeCompletedPendingCheckIns(JSON.stringify(completedActionIds));
          } else if (StreakWidgetModule.clearPendingCheckIns) {
            await StreakWidgetModule.clearPendingCheckIns();
          }

          const updatedStreaks = await streakService.getUserStreaks(userId);
          await this.syncToNativeWidget(updatedStreaks, userId);
        }
      }
    } catch (err) {
      console.warn('Failed to process pending widget check-ins:', err);
    }
  },

  /**
   * Safely clears all pinned streaks and native Android widget data
   * when the user signs out, preventing private habit exposure.
   */
  async clearWidgetOnLogout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WIDGET_PINNED_STREAK_KEY);
      await AsyncStorage.removeItem(WIDGET_PINNED_STREAKS_KEY);
      await AsyncStorage.removeItem('@streakmate/widget_capacity_mode');

      if (Platform.OS === 'android' && StreakWidgetModule?.clearWidgetData) {
        await StreakWidgetModule.clearWidgetData();
      }
    } catch (err) {
      console.warn('Failed to clear widget data on logout:', err);
    }
  },
};
