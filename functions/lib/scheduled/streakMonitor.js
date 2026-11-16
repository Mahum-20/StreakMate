"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorStreakExpirations = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fcmDispatcher_1 = require("../notifications/fcmDispatcher");
const streakLogic_1 = require("../streaks/streakLogic");
exports.monitorStreakExpirations = functions.pubsub
    .schedule('every 15 minutes')
    .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const nowMillis = now.toMillis();
    // Query active, at-risk, and frozen streaks to guarantee uninterrupted lifecycle tracking
    const activeStreaksSnap = await db
        .collection('streaks')
        .where('status', 'in', ['active', 'awaiting_checkin', 'at_risk', 'frozen'])
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
        const tz = data.timezone || 'UTC';
        const periodKey = data.currentPeriodKey || (0, streakLogic_1.calculatePeriodKey)(new Date(), tz);
        // If everyone already checked in for this period, nothing to remind or expire
        if (missingUids.length === 0) {
            continue;
        }
        // 1. Expiration check: Deadline passed and not all participants checked in
        if (remainingMinutes <= 0) {
            let freezeApplied = false;
            let newFreezes = 0;
            let actionCompleted = false;
            await db.runTransaction(async (t) => {
                const freshDoc = await t.get(streakDoc.ref);
                if (!freshDoc.exists)
                    return;
                const fresh = freshDoc.data();
                // Idempotency: Re-validate expiration state inside transaction
                if (fresh.lastExpiredPeriodKey === periodKey) {
                    return;
                }
                const freshCheckedIns = fresh.currentPeriodCheckIns || [];
                const freshMissing = participantUids.filter((uid) => !freshCheckedIns.includes(uid));
                if (freshMissing.length === 0) {
                    return; // Concurrent check-in completed in the interim
                }
                const currentFreezes = fresh.freezesRemaining ?? 0;
                actionCompleted = true;
                if (currentFreezes > 0) {
                    freezeApplied = true;
                    newFreezes = currentFreezes - 1;
                    const nextPeriodEnd = (0, streakLogic_1.getEndOfDay)(new Date(), tz);
                    const nextPeriodKey = (0, streakLogic_1.calculatePeriodKey)(new Date(), tz);
                    t.update(streakDoc.ref, {
                        status: 'frozen',
                        freezesRemaining: newFreezes,
                        lastExpiredPeriodKey: periodKey,
                        currentPeriodKey: nextPeriodKey,
                        currentPeriodCheckIns: [],
                        currentPeriodEnd: admin.firestore.Timestamp.fromDate(nextPeriodEnd),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    const histRef = streakDoc.ref.collection('history').doc(periodKey);
                    t.set(histRef, {
                        periodKey,
                        completed: false,
                        checkedInUids: freshCheckedIns,
                        missingUids: freshMissing,
                        finalStreakCount: fresh.currentStreak || 0,
                        usedFreeze: true,
                        finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                else {
                    freezeApplied = false;
                    t.update(streakDoc.ref, {
                        status: 'broken',
                        currentStreak: 0,
                        lastExpiredPeriodKey: periodKey,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    const histRef = streakDoc.ref.collection('history').doc(periodKey);
                    t.set(histRef, {
                        periodKey,
                        completed: false,
                        checkedInUids: freshCheckedIns,
                        missingUids: freshMissing,
                        finalStreakCount: 0,
                        usedFreeze: false,
                        finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            });
            if (actionCompleted) {
                if (freezeApplied) {
                    for (const uid of participantUids) {
                        await (0, fcmDispatcher_1.sendStreakNotification)({
                            streakId: streakDoc.id,
                            streakName: data.name,
                            recipientUid: uid,
                            title: `Streak Protected! ❄️`,
                            body: `A streak freeze protected your ${data.name} streak. You have ${newFreezes} freeze(s) remaining.`,
                        }).catch((err) => console.warn('Freeze notification failure', err));
                    }
                }
                else {
                    for (const uid of participantUids) {
                        await (0, fcmDispatcher_1.sendStreakNotification)({
                            streakId: streakDoc.id,
                            streakName: data.name,
                            recipientUid: uid,
                            title: `Streak Broken: ${data.name} 💔`,
                            body: `The check-in window closed. Restart together whenever you are ready!`,
                        }).catch((err) => console.warn('Notification failure', err));
                    }
                }
            }
            continue;
        }
        // 2. Final Urgent Warning: 30 minutes or less remaining (Deduplicated per period)
        if (remainingMinutes > 0 && remainingMinutes <= 30) {
            if (data.lastUrgentWarningPeriodKey === periodKey) {
                continue;
            }
            await streakDoc.ref.update({
                status: 'at_risk',
                lastUrgentWarningPeriodKey: periodKey,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            for (const uid of missingUids) {
                await (0, fcmDispatcher_1.sendStreakNotification)({
                    streakId: streakDoc.id,
                    streakName: data.name,
                    recipientUid: uid,
                    title: `30 Minutes Left! Save ${data.name} 🔥`,
                    body: `Your streak will break in 30 minutes. Complete your check-in now!`,
                }).catch((err) => console.warn('Warning notification failure', err));
            }
            continue;
        }
        // 3. Lead Reminder: 3 hours or less remaining (Deduplicated per period)
        if (remainingMinutes > 30 && remainingMinutes <= 180) {
            if (data.lastLeadReminderPeriodKey === periodKey) {
                continue;
            }
            await streakDoc.ref.update({
                lastLeadReminderPeriodKey: periodKey,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            const displayHours = remainingMinutes > 60
                ? `${Math.floor(remainingMinutes / 60)} hours`
                : `${remainingMinutes} mins`;
            for (const uid of missingUids) {
                await (0, fcmDispatcher_1.sendStreakNotification)({
                    streakId: streakDoc.id,
                    streakName: data.name,
                    recipientUid: uid,
                    title: `Save your ${data.name} streak ⏳`,
                    body: `${displayHours} remaining to check in today. Don't let your streak break!`,
                }).catch((err) => console.warn('Reminder failure', err));
            }
        }
    }
});
//# sourceMappingURL=streakMonitor.js.map