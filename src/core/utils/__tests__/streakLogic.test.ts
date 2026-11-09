import { describe, it, expect } from '@jest/globals';
import {
  calculateCheckInState,
  evaluateStreakExpiration,
  calculateNextStreakCount,
  preventDuplicateCheckIn,
  calculatePeriodKey,
  getEndOfDay,
  isStreakPeriodCurrent,
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

    it('correctly calculates end of day at 23:59:59.999', () => {
      const testDate = new Date('2026-11-08T22:00:00');
      const end = getEndOfDay(testDate);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
    });

    it('identifies when a period key is from yesterday vs today', () => {
      const today = new Date('2026-11-09T08:00:00Z');
      const yesterdayKey = '2026-11-08';
      const todayKey = '2026-11-09';
      expect(isStreakPeriodCurrent(yesterdayKey, 'UTC', today)).toBe(false);
      expect(isStreakPeriodCurrent(todayKey, 'UTC', today)).toBe(true);
    });
  });
});
