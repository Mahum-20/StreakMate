"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitCheckIn = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fcmDispatcher_1 = require("../notifications/fcmDispatcher");
exports.submitCheckIn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to submit a check-in.');
    }
    const { streakId } = data;
    if (!streakId || typeof streakId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'A valid streakId is required.');
    }
    const uid = context.auth.uid;
    const db = admin.firestore();
    const streakRef = db.collection('streaks').doc(streakId);
    let updatedStreakCount = 0;
    let allCompleted = false;
    let streakName = '';
    let participantUids = [];
    await db.runTransaction(async (transaction) => {
        const streakDoc = await transaction.get(streakRef);
        if (!streakDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Streak not found.');
        }
        const streakData = streakDoc.data();
        participantUids = streakData.participantUids || [];
        streakName = streakData.name || 'Streak';
        if (!participantUids.includes(uid)) {
            throw new functions.https.HttpsError('permission-denied', 'You are not a participant in this streak.');
        }
        if (streakData.status === 'broken' || streakData.status === 'paused') {
            throw new functions.https.HttpsError('failed-precondition', `Cannot check in to a ${streakData.status} streak.`);
        }
        const currentCheckIns = streakData.currentPeriodCheckIns || [];
        const periodKey = streakData.currentPeriodKey || new Date().toISOString().split('T')[0];
        // Idempotency check: already checked in for this period
        if (currentCheckIns.includes(uid)) {
            updatedStreakCount = streakData.currentStreak;
            return;
        }
        const newCheckIns = [...currentCheckIns, uid];
        allCompleted = participantUids.every((p) => newCheckIns.includes(p));
        const nextStreak = allCompleted ? (streakData.currentStreak || 0) + 1 : (streakData.currentStreak || 0);
        const longestStreak = Math.max(streakData.longestStreak || 0, nextStreak);
        updatedStreakCount = nextStreak;
        // 1. Record immutable check-in receipt document
        const receiptRef = streakRef.collection('checkIns').doc(`${periodKey}_${uid}`);
        transaction.set(receiptRef, {
            checkInId: `${periodKey}_${uid}`,
            streakId,
            userId: uid,
            periodKey,
            checkInTime: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 2. Update streak state
        transaction.update(streakRef, {
            currentPeriodCheckIns: newCheckIns,
            currentStreak: nextStreak,
            longestStreak,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 3. If cycle completed, record in history log
        if (allCompleted) {
            const historyRef = streakRef.collection('history').doc(periodKey);
            transaction.set(historyRef, {
                periodKey,
                completed: true,
                checkedInUids: newCheckIns,
                finalStreakCount: nextStreak,
                finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
    // If streak was saved today, dispatch celebratory notification to participants
    if (allCompleted) {
        for (const participant of participantUids) {
            await (0, fcmDispatcher_1.sendStreakNotification)({
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
    };
});
//# sourceMappingURL=checkIn.js.map