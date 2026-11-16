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
 * Helper to compute timezone offset in milliseconds for a specific UTC date.
 * Deterministic and cross-platform compatible across modern JS engines.
 */
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const localAsUtc = Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    parseInt(map.hour, 10),
    parseInt(map.minute, 10),
    parseInt(map.second, 10)
  );
  const dateUtcSeconds = Math.floor(date.getTime() / 1000) * 1000;
  return localAsUtc - dateUtcSeconds;
}

/**
 * Returns the precise end of the calendar day (23:59:59.999) in the specified IANA timezone.
 * Resolves the true calendar day boundary according to the streak's timezone rather than the host's clock.
 * Defaults to UTC if timezone is not provided or invalid.
 */
export function getEndOfDay(date: Date = new Date(), timezone: string = 'UTC'): Date {
  try {
    const periodKey = calculatePeriodKey(date, timezone);
    const [y, m, d] = periodKey.split('-').map(Number);
    const targetLocalUtc = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
    const approxDate = new Date(targetLocalUtc);
    const offset = getTimezoneOffsetMs(approxDate, timezone);
    const exactUtc = targetLocalUtc - offset;
    const finalOffset = getTimezoneOffsetMs(new Date(exactUtc), timezone);
    return new Date(targetLocalUtc - finalOffset);
  } catch {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
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
 */
export function evaluateStreakRollover(
  lastPeriodKey: string,
  todayKey: string,
  lastPeriodCompleted: boolean,
  currentStreak: number,
  freezesRemaining: number = 2,
  lastPeriodStatus?: string
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

  // If last period was completed OR was already frozen by the expiration monitor,
  // that period itself is protected/neutralized and does not incur a double freeze deduction.
  const wasProtected = lastPeriodCompleted || lastPeriodStatus === 'frozen';
  const missedDays = wasProtected ? Math.max(0, elapsedDays - 1) : elapsedDays;

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
