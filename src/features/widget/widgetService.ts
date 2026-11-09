import AsyncStorage from '@react-native-async-storage/async-storage';
import { streakService, StreakData } from '@/features/streaks/services/streakService';
import { calculatePeriodKey, getEndOfDay } from '@/core/utils/streakLogic';

const WIDGET_PINNED_STREAK_KEY = '@streakmate/pinned_widget_streak_id';

export interface WidgetStreakSnapshot {
  id: string;
  name: string;
  currentStreak: number;
  userCheckedIn: boolean;
  friendCheckedIn: boolean;
  friendName: string;
  hoursRemaining: number;
  status: 'active' | 'at_risk' | 'broken' | 'paused' | 'frozen';
  isSolo: boolean;
}

export const widgetService = {
  /**
   * Retrieves the ID of the streak pinned to the interactive widget.
   */
  async getPinnedStreakId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(WIDGET_PINNED_STREAK_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Pins a specific streak to the interactive widget.
   */
  async setPinnedStreakId(streakId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(WIDGET_PINNED_STREAK_KEY, streakId);
    } catch (e) {
      console.warn('Failed to save pinned widget streak id:', e);
    }
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
    const endOfDayMillis = getEndOfDay(new Date()).getTime();
    const hoursRemaining = Math.max(0, Math.floor((endOfDayMillis - now) / (1000 * 60 * 60)));

    return {
      id: streak.id,
      name: streak.name,
      currentStreak: streak.currentStreak,
      userCheckedIn,
      friendCheckedIn,
      friendName,
      hoursRemaining,
      status: streak.status,
      isSolo,
    };
  },

  /**
   * Performs an instant one-tap check-in directly for the interactive widget
   * without needing to open the full streak screen.
   */
  async quickCheckIn(streakId: string, userId: string): Promise<{ success: boolean; allCompleted: boolean; message: string }> {
    try {
      const result = await streakService.submitCheckIn(streakId, userId);
      return {
        success: true,
        allCompleted: result.allCompleted,
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
};
