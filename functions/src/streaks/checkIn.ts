import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendStreakNotification } from '../notifications/fcmDispatcher';
import {
  calculatePeriodKey,
  getEndOfDay,
  evaluateStreakRollover,
  checkMilestoneFreezeReward,
} from './streakLogic';

export const submitCheckIn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to submit a check-in.'
    );
  }

  const { streakId, actionId } = data;
  if (!streakId || typeof streakId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid streakId is required.'
    );
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const streakRef = db.collection('streaks').doc(streakId);

  let updatedStreakCount = 0;
  let allCompleted = false;
  let isNewlyCompleted = false;
  let streakName = '';
  let participantUids: string[] = [];
  let earnedMilestoneFreeze = false;
  let finalFreezes = 2;

  await db.runTransaction(async (transaction) => {
    const streakDoc = await transaction.get(streakRef);
    if (!streakDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Streak not found.');
    }

    const streakData = streakDoc.data()!;
    participantUids = streakData.participantUids || [];
    streakName = streakData.name || 'Streak';

    if (!participantUids.includes(uid)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You are not a participant in this streak.'
      );
    }

    if (streakData.status === 'broken' || streakData.status === 'paused' || streakData.status === 'deleting') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Cannot check in to a ${streakData.status} streak.`
      );
    }

    const now = new Date();
    const tz = streakData.timezone || 'UTC';
    const todayKey = calculatePeriodKey(now, tz);
    const isNewDay = Boolean(streakData.currentPeriodKey && streakData.currentPeriodKey !== todayKey);

    // 1. Evaluate Rollover from previous days (handles streak freezes & breaks)
    let currentCheckIns: string[] = isNewDay ? [] : (streakData.currentPeriodCheckIns || []);
    let baseStreak = streakData.currentStreak || 0;
    let currentFreezes = streakData.freezesRemaining ?? 2;

    if (isNewDay && streakData.currentPeriodKey) {
      const prevCheckIns: string[] = streakData.currentPeriodCheckIns || [];
      const prevAllDone = participantUids.length > 0 && participantUids.every((p) => prevCheckIns.includes(p));

      const rollover = evaluateStreakRollover(
        streakData.currentPeriodKey,
        todayKey,
        prevAllDone,
        baseStreak,
        currentFreezes,
        streakData.status
      );

      baseStreak = rollover.streakCount;
      currentFreezes = rollover.freezesRemaining;
    }

    // 2. Idempotency: user already checked in for today
    if (currentCheckIns.includes(uid)) {
      updatedStreakCount = baseStreak;
      allCompleted = participantUids.every((p) => currentCheckIns.includes(p));
      finalFreezes = currentFreezes;
      isNewlyCompleted = false;
      return;
    }

    // 3. Register user check-in
    const wasAlreadyCompleted = participantUids.length > 0 && participantUids.every((p) => currentCheckIns.includes(p));
    const newCheckIns = [...currentCheckIns, uid];
    allCompleted = participantUids.length > 0 && participantUids.every((p) => newCheckIns.includes(p));
    isNewlyCompleted = allCompleted && !wasAlreadyCompleted;

    const nextStreak = allCompleted ? baseStreak + 1 : baseStreak;
    const longestStreak = Math.max(streakData.longestStreak || 0, nextStreak);
    updatedStreakCount = nextStreak;
    const periodEnd = getEndOfDay(now, tz);

    // 4. Milestone Check: Award +1 streak freeze every 20 continuous days
    finalFreezes = currentFreezes;
    if (allCompleted) {
      const milestone = checkMilestoneFreezeReward(nextStreak, currentFreezes, 20);
      finalFreezes = milestone.newFreezesRemaining;
      earnedMilestoneFreeze = milestone.earnedFreeze;
    }

    // 5. Write immutable check-in receipt document
    const receiptRef = streakRef.collection('checkIns').doc(`${todayKey}_${uid}`);
    transaction.set(receiptRef, {
      checkInId: `${todayKey}_${uid}`,
      streakId,
      userId: uid,
      periodKey: todayKey,
      actionId: actionId || null,
      checkInTime: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 6. Update streak state
    transaction.update(streakRef, {
      currentPeriodKey: todayKey,
      currentPeriodCheckIns: newCheckIns,
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
      currentStreak: nextStreak,
      longestStreak,
      freezesRemaining: finalFreezes,
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 7. If cycle completed, record in history log
    if (allCompleted) {
      const historyRef = streakRef.collection('history').doc(todayKey);
      transaction.set(historyRef, {
        periodKey: todayKey,
        completed: true,
        checkedInUids: newCheckIns,
        finalStreakCount: nextStreak,
        finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  // If streak was newly saved today by this check-in, dispatch celebratory notification to participants
  // Eliminates duplicate push notifications on idempotent check-in retries
  if (isNewlyCompleted) {
    for (const participant of participantUids) {
      await sendStreakNotification({
        streakId,
        streakName,
        recipientUid: participant,
        title: `${streakName} is Saved! 🔥`,
        body: `Day ${updatedStreakCount} complete. Great teamwork keeping the habit alive!`,
      }).catch((err) => console.warn('Notification dispatch error', err));
    }
  }

  return {
    success: true,
    currentStreak: updatedStreakCount,
    allCompleted,
    earnedFreeze: earnedMilestoneFreeze,
    freezesRemaining: finalFreezes,
  };
});
