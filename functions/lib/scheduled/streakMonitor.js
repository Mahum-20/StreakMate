"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorStreakExpirations = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fcmDispatcher_1 = require("../notifications/fcmDispatcher");
exports.monitorStreakExpirations = functions.pubsub
    .schedule('every 15 minutes')
    .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const nowMillis = now.toMillis();
    // Query active streaks
    const activeStreaksSnap = await db
        .collection('streaks')
        .where('status', 'in', ['active', 'awaiting_checkin', 'at_risk'])
        .get();
    for (const streakDoc of activeStreaksSnap.docs) {
        const data = streakDoc.data();
        const currentPeriodEnd = data.currentPeriodEnd;
        if (!currentPeriodEnd)
            continue;
        const endMillis = currentPeriodEnd.toMillis();
        const remainingMinutes = Math.floor((endMillis - nowMillis) / (1000 * 60));
        const participantUids = data.participantUids || [];
        const checkedInUids = data.currentPeriodCheckIns || [];
        const missingUids = participantUids.filter((uid) => !checkedInUids.includes(uid));
        // 1. Expiration check: Deadline passed and not all participants checked in
        if (remainingMinutes <= 0 && missingUids.length > 0) {
            await db.runTransaction(async (t) => {
                t.update(streakDoc.ref, {
                    status: 'broken',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                // Log failure to history
                const periodKey = data.currentPeriodKey || new Date().toISOString().split('T')[0];
                const histRef = streakDoc.ref.collection('history').doc(periodKey);
                t.set(histRef, {
                    periodKey,
                    completed: false,
                    checkedInUids,
                    missingUids,
                    finalStreakCount: data.currentStreak || 0,
                    finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });
            // Notify participants that streak broke
            for (const uid of participantUids) {
                await (0, fcmDispatcher_1.sendStreakNotification)({
                    streakId: streakDoc.id,
                    streakName: data.name,
                    recipientUid: uid,
                    title: `Streak Broken: ${data.name}`,
                    body: `The check-in window closed. Restart together whenever you are ready!`,
                }).catch((err) => console.warn('Notification failure', err));
            }
            continue;
        }
        // 2. Final Warning: 30 minutes or less remaining
        if (remainingMinutes > 0 && remainingMinutes <= 30 && missingUids.length > 0) {
            if (data.status !== 'at_risk') {
                await streakDoc.ref.update({ status: 'at_risk' });
            }
            for (const uid of missingUids) {
                await (0, fcmDispatcher_1.sendStreakNotification)({
                    streakId: streakDoc.id,
                    streakName: data.name,
                    recipientUid: uid,
                    title: `30 Minutes Left! Save ${data.name}`,
                    body: `Your streak will break in 30 minutes. Complete your check-in now!`,
                }).catch((err) => console.warn('Warning notification failure', err));
            }
            continue;
        }
        // 3. Lead Reminder: 3 hours or less remaining
        if (remainingMinutes > 30 && remainingMinutes <= 180 && missingUids.length > 0) {
            for (const uid of missingUids) {
                await (0, fcmDispatcher_1.sendStreakNotification)({
                    streakId: streakDoc.id,
                    streakName: data.name,
                    recipientUid: uid,
                    title: `Save your ${data.name} streak`,
                    body: `${remainingMinutes > 60 ? Math.floor(remainingMinutes / 60) + ' hours' : remainingMinutes + ' mins'} remaining to check in today.`,
                }).catch((err) => console.warn('Reminder failure', err));
            }
        }
    }
});
//# sourceMappingURL=streakMonitor.js.map