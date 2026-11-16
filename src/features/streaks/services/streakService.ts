import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, cloudFunctions } from '@/core/config/firebase';
import {
  calculatePeriodKey,
  getEndOfDay,
  evaluateStreakRollover,
} from '@/core/utils/streakLogic';

export interface StreakData {
  id: string;
  name: string;
  description?: string | null;
  friendshipId?: string;
  isSolo?: boolean;
  participantUids: string[];
  participantNames: Record<string, string>;
  participantAvatars?: Record<string, string | null>;
  creatorUid: string;
  currentStreak: number;
  longestStreak: number;
  status: 'active' | 'at_risk' | 'broken' | 'paused' | 'frozen';
  currentPeriodKey: string;
  currentPeriodStart: Timestamp | null;
  currentPeriodEnd: Timestamp | null;
  currentPeriodCheckIns: string[];
  reminderLeadHours: number;
  freezesRemaining: number;
  timezone: string;
  lastNudgeAt?: Timestamp | null;
  lastNudgeBy?: string | null;
  lastNudgePhrase?: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CreateStreakInput {
  name: string;
  description?: string;
  isSolo?: boolean;
  friendUid?: string;
  friendName?: string;
  friendAvatarUrl?: string | null;
  creatorUid: string;
  creatorName: string;
  creatorAvatarUrl?: string | null;
  reminderLeadHours?: number;
  timezone?: string;
}

/**
 * Helper to normalize and compute real-time streak state and freeze rollover
 */
function mapStreakData(id: string, data: any): StreakData {
  const tz = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = calculatePeriodKey(new Date(), tz);
  const isNewDay = Boolean(data.currentPeriodKey && data.currentPeriodKey !== todayKey);

  let currentStreak = data.currentStreak || 0;
  let freezesRemaining = data.freezesRemaining ?? 2;
  let status: 'active' | 'at_risk' | 'broken' | 'paused' | 'frozen' = data.status || 'active';
  let currentPeriodCheckIns: string[] = isNewDay ? [] : (data.currentPeriodCheckIns || []);

  if (isNewDay && data.currentPeriodKey) {
    const participants: string[] = data.participantUids || [];
    const prevCheckIns: string[] = data.currentPeriodCheckIns || [];
    const prevAllDone = participants.length > 0 && participants.every((p: string) => prevCheckIns.includes(p));

    const rollover = evaluateStreakRollover(
      data.currentPeriodKey,
      todayKey,
      prevAllDone,
      currentStreak,
      freezesRemaining
    );

    currentStreak = rollover.streakCount;
    freezesRemaining = rollover.freezesRemaining;
    status = rollover.status;
  }

  return {
    id,
    name: data.name || 'Streak',
    description: data.description || null,
    friendshipId: data.friendshipId,
    isSolo: data.isSolo,
    participantUids: data.participantUids || [],
    participantNames: data.participantNames || {},
    participantAvatars: data.participantAvatars || {},
    creatorUid: data.creatorUid || '',
    currentStreak,
    longestStreak: data.longestStreak || 0,
    status,
    currentPeriodKey: isNewDay ? todayKey : (data.currentPeriodKey || ''),
    currentPeriodStart: data.currentPeriodStart || null,
    currentPeriodEnd: data.currentPeriodEnd || null,
    currentPeriodCheckIns,
    reminderLeadHours: data.reminderLeadHours || 3,
    freezesRemaining,
    timezone: tz,
    lastNudgeAt: data.lastNudgeAt || null,
    lastNudgeBy: data.lastNudgeBy || null,
    lastNudgePhrase: data.lastNudgePhrase || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export const streakService = {
  /**
   * Creates a new customized streak (solo or with a friend) in Cloud Firestore.
   */
  async createStreak(input: CreateStreakInput): Promise<string> {
    const tz = input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const periodKey = calculatePeriodKey(now, tz);

    // Standard period: ends at midnight (23:59:59) in the creator's timezone
    const periodEnd = getEndOfDay(now, tz);

    const isSolo = Boolean(input.isSolo || !input.friendUid);
    const participantUids = isSolo || !input.friendUid
      ? [input.creatorUid]
      : [input.creatorUid, input.friendUid];

    const participantNames: Record<string, string> = {
      [input.creatorUid]: input.creatorName,
    };
    if (!isSolo && input.friendUid && input.friendName) {
      participantNames[input.friendUid] = input.friendName;
    }

    const participantAvatars: Record<string, string | null> = {
      [input.creatorUid]: input.creatorAvatarUrl || null,
    };
    if (!isSolo && input.friendUid) {
      participantAvatars[input.friendUid] = input.friendAvatarUrl || null;
    }

    const streaksRef = collection(db, 'streaks');
    const docRef = await addDoc(streaksRef, {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isSolo,
      creatorUid: input.creatorUid,
      participantUids,
      participantNames,
      participantAvatars,
      currentStreak: 0,
      longestStreak: 0,
      status: 'active',
      currentPeriodKey: periodKey,
      currentPeriodStart: serverTimestamp(),
      currentPeriodEnd: Timestamp.fromDate(periodEnd),
      currentPeriodCheckIns: [],
      reminderLeadHours: input.reminderLeadHours || 3,
      freezesRemaining: 2, // Standard initial freeze buffer (2 freezes)
      timezone: tz,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  },

  /**
   * Subscribes to real-time updates for all streaks where user is a participant.
   */
  subscribeToUserStreaks(
    userId: string,
    onUpdate: (streaks: StreakData[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const streaksRef = collection(db, 'streaks');
    const q = query(streaksRef, where('participantUids', 'array-contains', userId));

    return onSnapshot(
      q,
      (snapshot) => {
        const streaks: StreakData[] = snapshot.docs.map((docSnap) => {
          return mapStreakData(docSnap.id, docSnap.data());
        });

        onUpdate(streaks);
      },
      (err) => {
        console.warn('Firestore subscribeToUserStreaks error:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Subscribes to a single streak document in real-time.
   */
  subscribeToStreak(
    streakId: string,
    onUpdate: (streak: StreakData | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const streakRef = doc(db, 'streaks', streakId);

    return onSnapshot(
      streakRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          onUpdate(null);
          return;
        }

        onUpdate(mapStreakData(docSnap.id, docSnap.data()));
      },
      (err) => {
        console.warn('Firestore subscribeToStreak error:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Fetches a single streak document once.
   */
  async getStreak(streakId: string): Promise<StreakData | null> {
    try {
      const snap = await getDoc(doc(db, 'streaks', streakId));
      if (!snap.exists()) return null;
      return mapStreakData(snap.id, snap.data());
    } catch (err) {
      console.warn('getStreak error:', err);
      return null;
    }
  },

  /**
   * Fetches all active streaks for a user once.
   */
  async getUserStreaks(userId: string): Promise<StreakData[]> {
    try {
      const q = query(
        collection(db, 'streaks'),
        where('participantUids', 'array-contains', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => mapStreakData(docSnap.id, docSnap.data()));
    } catch (err) {
      console.warn('getUserStreaks error:', err);
      return [];
    }
  },

  /**
   * Submits a check-in through the authoritative Cloud Function.
   * Ensures all streak counters, rollover, milestone rewards, and receipts
   * are computed and committed on the server.
   */
  async submitCheckIn(
    streakId: string,
    _userId?: string,
    actionId?: string
  ): Promise<{
    success: boolean;
    allCompleted: boolean;
    streakCount: number;
    earnedFreeze: boolean;
    freezesRemaining: number;
  }> {
    try {
      const callable = httpsCallable(cloudFunctions, 'submitCheckIn');
      const res = await callable({ streakId, actionId });
      const data = res.data as any;

      return {
        success: Boolean(data.success),
        allCompleted: Boolean(data.allCompleted),
        streakCount: Number(data.currentStreak ?? 0),
        earnedFreeze: Boolean(data.earnedFreeze),
        freezesRemaining: Number(data.freezesRemaining ?? 2),
      };
    } catch (err: any) {
      console.warn('Authoritative submitCheckIn error:', err);
      throw err;
    }
  },

  /**
   * Pauses an active streak.
   */
  async pauseStreak(streakId: string): Promise<void> {
    const streakRef = doc(db, 'streaks', streakId);
    await setDoc(streakRef, { status: 'paused', updatedAt: serverTimestamp() }, { merge: true });
  },

  /**
   * Resumes a paused streak.
   */
  async resumeStreak(streakId: string): Promise<void> {
    const streakRef = doc(db, 'streaks', streakId);
    await setDoc(streakRef, { status: 'active', updatedAt: serverTimestamp() }, { merge: true });
  },

  /**
   * Deletes a streak permanently via server-authoritative cascading deletion Cloud Function.
   * Recursively deletes check-in receipts, history logs, and related nudges before removing the streak.
   */
  async deleteStreak(streakId: string): Promise<void> {
    try {
      const callable = httpsCallable(cloudFunctions, 'deleteStreak');
      await callable({ streakId });
    } catch (err) {
      console.warn('Backend deleteStreak callable notice:', err);
      // Fallback: direct delete of parent document if callable unavailable
      const streakRef = doc(db, 'streaks', streakId);
      await deleteDoc(streakRef);
    }
  },
};
