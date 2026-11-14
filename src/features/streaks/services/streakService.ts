import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import {
  calculatePeriodKey,
  getEndOfDay,
  evaluateStreakRollover,
  checkMilestoneFreezeReward,
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
    const periodEnd = getEndOfDay(now);

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
   * Submits a check-in for the current period using an atomic transaction.
   * Handles automatic streak freeze deduction on rollover and awards
   * +1 streak freeze on 20-day milestones.
   */
  async submitCheckIn(
    streakId: string,
    userId: string
  ): Promise<{
    success: boolean;
    allCompleted: boolean;
    streakCount: number;
    earnedFreeze: boolean;
    freezesRemaining: number;
  }> {
    const streakRef = doc(db, 'streaks', streakId);

    return await runTransaction(db, async (transaction) => {
      const streakSnap = await transaction.get(streakRef);
      if (!streakSnap.exists()) {
        throw new Error('Streak does not exist');
      }

      const data = streakSnap.data();
      const participants: string[] = data.participantUids || [];
      const now = new Date();
      const tz = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const todayKey = calculatePeriodKey(now, tz);
      const isNewDay = Boolean(data.currentPeriodKey && data.currentPeriodKey !== todayKey);

      // 1. Evaluate Rollover from previous days using evaluateStreakRollover
      let currentCheckIns: string[] = isNewDay ? [] : (data.currentPeriodCheckIns || []);
      let baseStreak = data.currentStreak || 0;
      let currentFreezes = data.freezesRemaining ?? 2;

      if (isNewDay && data.currentPeriodKey) {
        const prevCheckIns: string[] = data.currentPeriodCheckIns || [];
        const prevAllDone = participants.length > 0 && participants.every((p) => prevCheckIns.includes(p));

        const rollover = evaluateStreakRollover(
          data.currentPeriodKey,
          todayKey,
          prevAllDone,
          baseStreak,
          currentFreezes
        );

        baseStreak = rollover.streakCount;
        currentFreezes = rollover.freezesRemaining;
      }

      // 2. Idempotency: User already checked in for today
      if (currentCheckIns.includes(userId)) {
        const allDone = participants.every((p) => currentCheckIns.includes(p));
        return {
          success: true,
          allCompleted: allDone,
          streakCount: baseStreak,
          earnedFreeze: false,
          freezesRemaining: currentFreezes,
        };
      }

      // 3. Register user check-in
      const newCheckIns = [...currentCheckIns, userId];
      const allCompleted = participants.length > 0 && participants.every((p) => newCheckIns.includes(p));
      const newStreakCount = allCompleted ? baseStreak + 1 : baseStreak;
      const newLongest = Math.max(data.longestStreak || 0, newStreakCount);
      const periodEnd = getEndOfDay(now);

      // 4. Milestone Check: Award +1 streak freeze every 20 continuous days!
      let finalFreezes = currentFreezes;
      let earnedMilestoneFreeze = false;
      if (allCompleted) {
        const milestone = checkMilestoneFreezeReward(newStreakCount, currentFreezes, 20);
        finalFreezes = milestone.newFreezesRemaining;
        earnedMilestoneFreeze = milestone.earnedFreeze;
      }

      // 5. Write immutable receipt document for today's check-in
      const receiptRef = doc(db, 'streaks', streakId, 'checkIns', `${todayKey}_${userId}`);
      transaction.set(receiptRef, {
        checkInId: `${todayKey}_${userId}`,
        streakId,
        userId,
        periodKey: todayKey,
        checkInTime: serverTimestamp(),
      });

      // 6. Update streak document in Firestore
      transaction.update(streakRef, {
        currentPeriodKey: todayKey,
        currentPeriodCheckIns: newCheckIns,
        currentPeriodEnd: Timestamp.fromDate(periodEnd),
        currentStreak: newStreakCount,
        longestStreak: newLongest,
        freezesRemaining: finalFreezes,
        status: 'active',
        updatedAt: serverTimestamp(),
      });

      // 7. If all completed, log to history
      if (allCompleted) {
        const historyRef = doc(db, 'streaks', streakId, 'history', todayKey);
        transaction.set(historyRef, {
          periodKey: todayKey,
          completed: true,
          checkedInUids: newCheckIns,
          finalStreakCount: newStreakCount,
          finalizedAt: serverTimestamp(),
        });
      }

      return {
        success: true,
        allCompleted,
        streakCount: newStreakCount,
        earnedFreeze: earnedMilestoneFreeze,
        freezesRemaining: finalFreezes,
      };
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
