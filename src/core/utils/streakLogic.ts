export interface PeriodBoundaries {
  periodKey: string;
  startMillis: number;
  endMillis: number;
}

export interface CheckInState {
  userCheckedIn: boolean;
  allParticipantsCheckedIn: boolean;
  missingUids: string[];
}

export type ExpirationStatus = 'active' | 'lead_reminder' | 'urgent_warning' | 'expired';

export function calculatePeriodKey(date: Date, timezone: string = 'UTC'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // YYYY-MM-DD
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Returns the precise end of the calendar day (23:59:59.999) for the given date.
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Checks if a streak's stored period key matches the current calendar day in the given timezone.
 */
export function isStreakPeriodCurrent(
  periodKey: string | undefined | null,
  timezone: string = 'UTC',
  now: Date = new Date()
): boolean {
  if (!periodKey) return false;
  const todayKey = calculatePeriodKey(now, timezone);
  return periodKey === todayKey;
}

export function calculateCheckInState(
  participantUids: string[],
  currentCheckIns: string[],
  userUid: string
): CheckInState {
  const userCheckedIn = currentCheckIns.includes(userUid);
  const missingUids = participantUids.filter((uid) => !currentCheckIns.includes(uid));
  const allParticipantsCheckedIn = participantUids.length > 0 && missingUids.length === 0;

  return {
    userCheckedIn,
    allParticipantsCheckedIn,
    missingUids,
  };
}

export function evaluateStreakExpiration(
  nowMillis: number,
  periodEndMillis: number,
  isMissingCheckIn: boolean
): ExpirationStatus {
  const remainingMinutes = Math.floor((periodEndMillis - nowMillis) / (1000 * 60));

  if (remainingMinutes <= 0 && isMissingCheckIn) {
    return 'expired';
  }

  if (remainingMinutes > 0 && remainingMinutes <= 30 && isMissingCheckIn) {
    return 'urgent_warning';
  }

  if (remainingMinutes > 30 && remainingMinutes <= 180 && isMissingCheckIn) {
    return 'lead_reminder';
  }

  return 'active';
}

export function calculateNextStreakCount(
  currentStreak: number,
  allParticipantsCheckedIn: boolean
): number {
  if (allParticipantsCheckedIn) {
    return currentStreak + 1;
  }
  return currentStreak;
}

export function preventDuplicateCheckIn(
  currentCheckIns: string[],
  userUid: string
): { isDuplicate: boolean; updatedCheckIns: string[] } {
  if (currentCheckIns.includes(userUid)) {
    return { isDuplicate: true, updatedCheckIns: currentCheckIns };
  }
  return { isDuplicate: false, updatedCheckIns: [...currentCheckIns, userUid] };
}

/**
 * Calculates the exact integer difference in calendar days between two period keys (YYYY-MM-DD).
 */
export function calculateDaysBetweenPeriods(earlierKey: string, laterKey: string): number {
  try {
    const [y1, m1, d1] = earlierKey.split('-').map(Number);
    const [y2, m2, d2] = laterKey.split('-').map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    const diffMillis = utc2 - utc1;
    return Math.round(diffMillis / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export interface StreakRolloverResult {
  streakCount: number;
  freezesRemaining: number;
  freezesUsed: number;
  status: 'active' | 'frozen' | 'broken';
  isBroken: boolean;
  missedDays: number;
}

/**
 * Evaluates whether a streak continues, consumes streak freeze(s), or breaks
 * when transitioning across calendar days.
 *
 * Rules:
 * - If 0 days missed: streak active, 0 freezes used.
 * - If 1+ days missed and missedDays <= freezesRemaining:
 *     streak preserved (frozen), freezes reduced by missedDays.
 * - If missedDays > freezesRemaining:
 *     streak breaks, counter resets to 0, all freezes depleted (0).
 */
export function evaluateStreakRollover(
  lastPeriodKey: string,
  todayKey: string,
  lastPeriodCompleted: boolean,
  currentStreak: number,
  freezesRemaining: number = 2
): StreakRolloverResult {
  if (!lastPeriodKey || lastPeriodKey === todayKey) {
    return {
      streakCount: currentStreak,
      freezesRemaining,
      freezesUsed: 0,
      status: 'active',
      isBroken: false,
      missedDays: 0,
    };
  }

  const elapsedDays = calculateDaysBetweenPeriods(lastPeriodKey, todayKey);
  if (elapsedDays <= 0) {
    return {
      streakCount: currentStreak,
      freezesRemaining,
      freezesUsed: 0,
      status: 'active',
      isBroken: false,
      missedDays: 0,
    };
  }

  // If last period was completed, yesterday was only missed if elapsedDays > 1.
  // If last period was NOT completed, that period itself was already missed.
  const missedDays = lastPeriodCompleted ? Math.max(0, elapsedDays - 1) : elapsedDays;

  if (missedDays === 0) {
    return {
      streakCount: currentStreak,
      freezesRemaining,
      freezesUsed: 0,
      status: 'active',
      isBroken: false,
      missedDays: 0,
    };
  }

  // If user had no streak active, nothing to freeze or break
  if (currentStreak <= 0) {
    return {
      streakCount: 0,
      freezesRemaining,
      freezesUsed: 0,
      status: 'active',
      isBroken: false,
      missedDays,
    };
  }

  // Check if freezes can protect the streak
  if (missedDays <= freezesRemaining) {
    const newFreezes = freezesRemaining - missedDays;
    return {
      streakCount: currentStreak,
      freezesRemaining: newFreezes,
      freezesUsed: missedDays,
      status: 'frozen',
      isBroken: false,
      missedDays,
    };
  }

  // Missed days exceed remaining freezes -> Streak breaks
  return {
    streakCount: 0,
    freezesRemaining: 0,
    freezesUsed: freezesRemaining,
    status: 'broken',
    isBroken: true,
    missedDays,
  };
}

export interface MilestoneRewardResult {
  earnedFreeze: boolean;
  newFreezesRemaining: number;
  milestoneStreak: number;
}

/**
 * Checks if completing the streak achieves a 20-day milestone and awards +1 streak freeze.
 */
export function checkMilestoneFreezeReward(
  newStreakCount: number,
  currentFreezesRemaining: number,
  milestoneStep: number = 20
): MilestoneRewardResult {
  if (newStreakCount > 0 && newStreakCount % milestoneStep === 0) {
    return {
      earnedFreeze: true,
      newFreezesRemaining: currentFreezesRemaining + 1,
      milestoneStreak: newStreakCount,
    };
  }
  return {
    earnedFreeze: false,
    newFreezesRemaining: currentFreezesRemaining,
    milestoneStreak: newStreakCount,
  };
}
