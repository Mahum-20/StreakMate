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
