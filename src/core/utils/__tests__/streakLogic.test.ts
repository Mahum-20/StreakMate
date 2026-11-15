import { describe, it, expect } from '@jest/globals';
import {
  calculateCheckInState,
  evaluateStreakExpiration,
  calculateNextStreakCount,
  preventDuplicateCheckIn,
  calculatePeriodKey,
  getEndOfDay,
  isStreakPeriodCurrent,
  calculateDaysBetweenPeriods,
  evaluateStreakRollover,
  checkMilestoneFreezeReward,
} from '../streakLogic';

describe('Streak Calculation & Lifecycle Logic Engine', () => {
  const userA = 'user_alex_123';
  const userB = 'user_sarah_456';
  const participants = [userA, userB];

  describe('Check-In State Evaluation', () => {
    it('correctly identifies when neither participant has checked in', () => {
      const state = calculateCheckInState(participants, [], userA);
      expect(state.userCheckedIn).toBe(false);
      expect(state.allParticipantsCheckedIn).toBe(false);
      expect(state.missingUids).toEqual([userA, userB]);
    });

    it('correctly tracks when current user checked in, but friend is pending', () => {
      const state = calculateCheckInState(participants, [userA], userA);
      expect(state.userCheckedIn).toBe(true);
      expect(state.allParticipantsCheckedIn).toBe(false);
      expect(state.missingUids).toEqual([userB]);
    });

    it('correctly identifies when friend checked in, but current user is pending', () => {
      const state = calculateCheckInState(participants, [userB], userA);
      expect(state.userCheckedIn).toBe(false);
      expect(state.allParticipantsCheckedIn).toBe(false);
      expect(state.missingUids).toEqual([userA]);
    });

    it('marks streak completed for the period when all participants have checked in', () => {
      const state = calculateCheckInState(participants, [userA, userB], userA);
      expect(state.userCheckedIn).toBe(true);
      expect(state.allParticipantsCheckedIn).toBe(true);
      expect(state.missingUids).toEqual([]);
    });
  });

  describe('Duplicate Check-In Prevention', () => {
    it('permits initial check-in and appends user ID', () => {
      const result = preventDuplicateCheckIn([], userA);
      expect(result.isDuplicate).toBe(false);
      expect(result.updatedCheckIns).toEqual([userA]);
    });

    it('strictly prevents duplicate check-in if user already checked in', () => {
      const existing = [userA];
      const result = preventDuplicateCheckIn(existing, userA);
      expect(result.isDuplicate).toBe(true);
      expect(result.updatedCheckIns).toEqual([userA]);
    });
  });

  describe('Authoritative Streak Counter', () => {
    it('does not increment counter if check-in is incomplete', () => {
      const count = calculateNextStreakCount(14, false);
      expect(count).toBe(14);
    });

    it('increments streak counter when all participants fulfill check-in', () => {
      const count = calculateNextStreakCount(14, true);
      expect(count).toBe(15);
    });
  });

  describe('Smart Expiration & Notification Thresholds', () => {
    const now = 1000000000000;

    it('reports active status when more than 3 hours remain', () => {
      const fourHoursLater = now + 4 * 60 * 60 * 1000;
      const status = evaluateStreakExpiration(now, fourHoursLater, true);
      expect(status).toBe('active');
    });

    it('triggers lead_reminder when <= 3 hours remain and check-in is missing', () => {
      const twoHoursLater = now + 2 * 60 * 60 * 1000;
      const status = evaluateStreakExpiration(now, twoHoursLater, true);
      expect(status).toBe('lead_reminder');
    });

    it('triggers urgent_warning when <= 30 minutes remain and check-in is missing', () => {
      const twentyMinsLater = now + 20 * 60 * 1000;
      const status = evaluateStreakExpiration(now, twentyMinsLater, true);
      expect(status).toBe('urgent_warning');
    });

    it('triggers expired when deadline has passed and check-in is missing', () => {
      const fiveMinsAgo = now - 5 * 60 * 1000;
      const status = evaluateStreakExpiration(now, fiveMinsAgo, true);
      expect(status).toBe('expired');
    });

    it('remains active when deadline is approaching but check-in is already fulfilled', () => {
      const twentyMinsLater = now + 20 * 60 * 1000;
      const status = evaluateStreakExpiration(now, twentyMinsLater, false);
      expect(status).toBe('active');
    });
  });

  describe('Timezone Day Boundaries', () => {
    it('formats consistent YYYY-MM-DD period keys', () => {
      const testDate = new Date('2026-11-06T12:00:00Z');
      const keyUTC = calculatePeriodKey(testDate, 'UTC');
      expect(keyUTC).toBe('2026-11-06');
    });

    it('correctly calculates end of day at 23:59:59.999 in UTC', () => {
      const testDate = new Date('2026-11-15T12:00:00Z');
      const end = getEndOfDay(testDate, 'UTC');
      expect(end.toISOString()).toBe('2026-11-15T23:59:59.999Z');
    });

    it('correctly calculates end of day in America/New_York (UTC-5)', () => {
      const testDate = new Date('2026-11-15T12:00:00Z');
      const end = getEndOfDay(testDate, 'America/New_York');
      expect(end.toISOString()).toBe('2026-11-16T04:59:59.999Z');
    });

    it('correctly calculates end of day in Asia/Tokyo (UTC+9)', () => {
      const testDate = new Date('2026-11-15T12:00:00Z');
      const end = getEndOfDay(testDate, 'Asia/Tokyo');
      expect(end.toISOString()).toBe('2026-11-15T14:59:59.999Z');
    });

    it('correctly calculates end of day in Europe/London (UTC+0 in winter)', () => {
      const testDate = new Date('2026-11-15T12:00:00Z');
      const end = getEndOfDay(testDate, 'Europe/London');
      expect(end.toISOString()).toBe('2026-11-15T23:59:59.999Z');
    });

    it('identifies when a period key is from yesterday vs today', () => {
      const today = new Date('2026-11-09T08:00:00Z');
      const yesterdayKey = '2026-11-08';
      const todayKey = '2026-11-09';
      expect(isStreakPeriodCurrent(yesterdayKey, 'UTC', today)).toBe(false);
      expect(isStreakPeriodCurrent(todayKey, 'UTC', today)).toBe(true);
    });
  });

  describe('Calendar Day Differences', () => {
    it('calculates 1 day difference between consecutive dates', () => {
      expect(calculateDaysBetweenPeriods('2026-11-10', '2026-11-11')).toBe(1);
    });

    it('calculates multiple days difference', () => {
      expect(calculateDaysBetweenPeriods('2026-11-10', '2026-11-13')).toBe(3);
    });

    it('handles month rollovers properly', () => {
      expect(calculateDaysBetweenPeriods('2026-10-31', '2026-11-02')).toBe(2);
    });
  });

  describe('Streak Rollover & Streak Freeze Lifecycle Engine', () => {
    it('maintains active streak on next day with no missed days', () => {
      // User completed Nov 10, now it is Nov 11
      const result = evaluateStreakRollover('2026-11-10', '2026-11-11', true, 1, 2);
      expect(result.streakCount).toBe(1);
      expect(result.freezesRemaining).toBe(2);
      expect(result.freezesUsed).toBe(0);
      expect(result.status).toBe('active');
      expect(result.isBroken).toBe(false);
      expect(result.missedDays).toBe(0);
    });

    it('consumes 1 freeze when 1 full calendar day is missed and preserves streak', () => {
      // User completed Nov 10, missed all of Nov 11, now it is Nov 12
      const result = evaluateStreakRollover('2026-11-10', '2026-11-12', true, 1, 2);
      expect(result.streakCount).toBe(1); // Protected at 1!
      expect(result.freezesRemaining).toBe(1); // 2 -> 1
      expect(result.freezesUsed).toBe(1);
      expect(result.status).toBe('frozen');
      expect(result.isBroken).toBe(false);
      expect(result.missedDays).toBe(1);
    });

    it('consumes 2 freezes when 2 full calendar days are missed and preserves streak', () => {
      // User completed Nov 10, missed Nov 11 and Nov 12, now it is Nov 13
      const result = evaluateStreakRollover('2026-11-10', '2026-11-13', true, 5, 2);
      expect(result.streakCount).toBe(5); // Protected at 5!
      expect(result.freezesRemaining).toBe(0); // 2 -> 0
      expect(result.freezesUsed).toBe(2);
      expect(result.status).toBe('frozen');
      expect(result.isBroken).toBe(false);
      expect(result.missedDays).toBe(2);
    });

    it('breaks streak and resets to 0 when missed days exceed available freezes', () => {
      // User completed Nov 10, missed Nov 11, Nov 12, Nov 13, now it is Nov 14 (3 days missed) with only 2 freezes
      const result = evaluateStreakRollover('2026-11-10', '2026-11-14', true, 5, 2);
      expect(result.streakCount).toBe(0); // Reset to 0!
      expect(result.freezesRemaining).toBe(0);
      expect(result.freezesUsed).toBe(2);
      expect(result.status).toBe('broken');
      expect(result.isBroken).toBe(true);
      expect(result.missedDays).toBe(3);
    });

    it('breaks streak immediately if 1 day is missed with 0 freezes remaining', () => {
      const result = evaluateStreakRollover('2026-11-10', '2026-11-12', true, 10, 0);
      expect(result.streakCount).toBe(0);
      expect(result.freezesRemaining).toBe(0);
      expect(result.status).toBe('broken');
      expect(result.isBroken).toBe(true);
    });
  });

  describe('Milestone Freeze Rewards (+1 Every 20 Continuous Days)', () => {
    it('awards +1 streak freeze when hitting a 20-day milestone', () => {
      const reward = checkMilestoneFreezeReward(20, 1);
      expect(reward.earnedFreeze).toBe(true);
      expect(reward.newFreezesRemaining).toBe(2);
      expect(reward.milestoneStreak).toBe(20);
    });

    it('awards +1 streak freeze on 40-day milestone', () => {
      const reward = checkMilestoneFreezeReward(40, 2);
      expect(reward.earnedFreeze).toBe(true);
      expect(reward.newFreezesRemaining).toBe(3);
    });

    it('does not award freeze on non-milestone days', () => {
      const reward = checkMilestoneFreezeReward(19, 1);
      expect(reward.earnedFreeze).toBe(false);
      expect(reward.newFreezesRemaining).toBe(1);
    });

    it('does not award freeze on streak of 0', () => {
      const reward = checkMilestoneFreezeReward(0, 2);
      expect(reward.earnedFreeze).toBe(false);
      expect(reward.newFreezesRemaining).toBe(2);
    });
  });
});
