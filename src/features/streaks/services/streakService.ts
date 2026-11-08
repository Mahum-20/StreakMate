import {
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { calculatePeriodKey } from '@/core/utils/streakLogic';

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

export const streakService = {
  /**
   * Creates a new customized streak (solo or with a friend) in Cloud Firestore.
   */
  async createStreak(input: CreateStreakInput): Promise<string> {
    const tz = input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const periodKey = calculatePeriodKey(now, tz);

    // Standard period: ends at midnight (23:59:59) in the creator's timezone
    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);

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
      freezesRemaining: 2, // Standard initial freeze buffer
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
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || 'Streak',
            description: data.description || null,
            friendshipId: data.friendshipId,
            participantUids: data.participantUids || [],
            participantNames: data.participantNames || {},
            participantAvatars: data.participantAvatars || {},
            creatorUid: data.creatorUid || '',
            currentStreak: data.currentStreak || 0,
            longestStreak: data.longestStreak || 0,
            status: data.status || 'active',
            currentPeriodKey: data.currentPeriodKey || '',
            currentPeriodStart: data.currentPeriodStart || null,
            currentPeriodEnd: data.currentPeriodEnd || null,
            currentPeriodCheckIns: data.currentPeriodCheckIns || [],
            reminderLeadHours: data.reminderLeadHours || 3,
            freezesRemaining: data.freezesRemaining ?? 2,
            timezone: data.timezone || 'UTC',
            lastNudgeAt: data.lastNudgeAt || null,
            lastNudgeBy: data.lastNudgeBy || null,
            lastNudgePhrase: data.lastNudgePhrase || null,
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
          };
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

        const data = docSnap.data();
        onUpdate({
          id: docSnap.id,
          name: data.name || 'Streak',
          description: data.description || null,
          friendshipId: data.friendshipId,
          participantUids: data.participantUids || [],
          participantNames: data.participantNames || {},
          participantAvatars: data.participantAvatars || {},
          creatorUid: data.creatorUid || '',
          currentStreak: data.currentStreak || 0,
          longestStreak: data.longestStreak || 0,
          status: data.status || 'active',
          currentPeriodKey: data.currentPeriodKey || '',
          currentPeriodStart: data.currentPeriodStart || null,
          currentPeriodEnd: data.currentPeriodEnd || null,
          currentPeriodCheckIns: data.currentPeriodCheckIns || [],
          reminderLeadHours: data.reminderLeadHours || 3,
          freezesRemaining: data.freezesRemaining ?? 2,
          timezone: data.timezone || 'UTC',
          lastNudgeAt: data.lastNudgeAt || null,
          lastNudgeBy: data.lastNudgeBy || null,
          lastNudgePhrase: data.lastNudgePhrase || null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        });
      },
      (err) => {
        console.warn('Firestore subscribeToStreak error:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Submits a check-in for the current period using an atomic transaction.
   */
  async submitCheckIn(streakId: string, userId: string): Promise<{ success: boolean; allCompleted: boolean }> {
    const streakRef = doc(db, 'streaks', streakId);

    return await runTransaction(db, async (transaction) => {
      const streakSnap = await transaction.get(streakRef);
      if (!streakSnap.exists()) {
        throw new Error('Streak does not exist');
      }

      const data = streakSnap.data();
      const currentCheckIns: string[] = data.currentPeriodCheckIns || [];
      const participants: string[] = data.participantUids || [];

      // Idempotency: User already checked in
      if (currentCheckIns.includes(userId)) {
        const allDone = participants.every((p) => currentCheckIns.includes(p));
        return { success: true, allCompleted: allDone };
      }

      const newCheckIns = [...currentCheckIns, userId];
      const allCompleted = participants.length > 0 && participants.every((p) => newCheckIns.includes(p));

      const newStreakCount = allCompleted ? (data.currentStreak || 0) + 1 : (data.currentStreak || 0);
      const newLongest = Math.max(data.longestStreak || 0, newStreakCount);

      const periodKey = data.currentPeriodKey || calculatePeriodKey(new Date(), data.timezone);

      // 1. Write immutable receipt document
      const receiptRef = doc(db, 'streaks', streakId, 'checkIns', `${periodKey}_${userId}`);
      transaction.set(receiptRef, {
        checkInId: `${periodKey}_${userId}`,
        streakId,
        userId,
        periodKey,
        checkInTime: serverTimestamp(),
      });

      // 2. Update streak status
      transaction.update(streakRef, {
        currentPeriodCheckIns: newCheckIns,
        currentStreak: newStreakCount,
        longestStreak: newLongest,
        updatedAt: serverTimestamp(),
      });

      // 3. If all completed, log to history
      if (allCompleted) {
        const historyRef = doc(db, 'streaks', streakId, 'history', periodKey);
        transaction.set(historyRef, {
          periodKey,
          completed: true,
          checkedInUids: newCheckIns,
          finalStreakCount: newStreakCount,
          finalizedAt: serverTimestamp(),
        });
      }

      return { success: true, allCompleted };
    });
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
};
