"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorStreakExpirations = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fcmDispatcher_1 = require("../notifications/fcmDispatcher");
const streakLogic_1 = require("../streaks/streakLogic");
/**
 * Claims an outbox event atomically. Supports being called inside an existing transaction
 * or initiating its own transaction. Enforces a 5-minute lease to enable automatic recovery
 * if a Cloud Function instance crashes mid-delivery.
 */
async function claimOutboxRecord(db, outboxId, eventData, existingTransaction) {
    const outboxRef = db.collection('notificationOutbox').doc(outboxId);
    const nowMillis = Date.now();
    const leaseDurationMs = 5 * 60 * 1000; // 5 minute lease
    const runClaim = async (t) => {
        const snap = await t.get(outboxRef);
        if (snap.exists) {
            const data = snap.data();
            if (data.status === 'delivered') {
                return { claimed: false, targetUids: [] };
            }
            if (data.status === 'failed' && data.attempts >= 3) {
                return { claimed: false, targetUids: [] };
            }
            if (data.status === 'processing') {
                const lease = data.leaseExpiresAt;
                if (lease && lease.toMillis() > nowMillis) {
                    // Lease is still actively held by another running worker
                    return { claimed: false, targetUids: [] };
                }
                // Worker crashed or timed out: safely reclaim expired lease
            }
            // Filter targetUids to only recipients who have NOT yet successfully received it
            const pendingRecipients = eventData.targetUids.filter((u) => !data.recipients?.[u]?.delivered);
            if (pendingRecipients.length === 0) {
                t.update(outboxRef, {
                    status: 'delivered',
                    deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return { claimed: false, targetUids: [] };
            }
            t.set(outboxRef, {
                status: 'processing',
                attempts: admin.firestore.FieldValue.increment(1),
                leaseExpiresAt: admin.firestore.Timestamp.fromMillis(nowMillis + leaseDurationMs),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            return { claimed: true, targetUids: pendingRecipients };
        }
        // New event record creation
        const initialRecipients = {};
        for (const uid of eventData.targetUids) {
            initialRecipients[uid] = { delivered: false };
        }
        t.set(outboxRef, {
            id: outboxId,
            streakId: eventData.streakId,
            streakName: eventData.streakName,
            periodKey: eventData.periodKey,
            type: eventData.type,
            status: 'processing',
            attempts: 1,
            leaseExpiresAt: admin.firestore.Timestamp.fromMillis(nowMillis + leaseDurationMs),
            title: eventData.title,
            body: eventData.body,
            recipients: initialRecipients,
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { claimed: true, targetUids: eventData.targetUids };
    };
    if (existingTransaction) {
        return runClaim(existingTransaction);
    }
    else {
        return db.runTransaction(runClaim);
    }
}
/**
 * Dispatches notifications to target recipients with per-recipient tracking.
 * Marks outbox 'delivered' only after ALL recipients succeed; marks 'pending' with retry otherwise.
 */
async function executeOutboxDelivery(db, outboxId, event) {
    const outboxRef = db.collection('notificationOutbox').doc(outboxId);
    let allDelivered = true;
    const updates = {};
    for (const uid of event.targetUids) {
        try {
            await (0, fcmDispatcher_1.sendStreakNotification)({
                streakId: event.streakId,
                streakName: event.streakName,
                recipientUid: uid,
                title: event.title,
                body: event.body,
            });
            updates[`recipients.${uid}.delivered`] = true;
            updates[`recipients.${uid}.deliveredAt`] = admin.firestore.FieldValue.serverTimestamp();
        }
        catch (err) {
            allDelivered = false;
            updates[`recipients.${uid}.delivered`] = false;
            updates[`recipients.${uid}.error`] = err?.message || String(err);
            console.warn(`Delivery failure for recipient ${uid} on outbox ${outboxId}:`, err);
        }
    }
    const outboxSnap = await outboxRef.get();
    const currentAttempts = outboxSnap.data()?.attempts || 1;
    if (allDelivered) {
        updates.status = 'delivered';
        updates.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
    }
    else if (currentAttempts >= 3) {
        updates.status = 'failed';
    }
    else {
        updates.status = 'pending';
    }
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await outboxRef.update(updates).catch((err) => console.warn('Outbox update error:', err));
}
exports.monitorStreakExpirations = functions.pubsub
    .schedule('every 15 minutes')
    .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const nowMillis = now.toMillis();
    // 0. Retry pending or crashed outbox deliveries from previous runs
    try {
        const pendingOutboxSnap = await db
            .collection('notificationOutbox')
            .where('status', 'in', ['pending', 'processing'])
            .limit(20)
            .get();
        for (const docSnap of pendingOutboxSnap.docs) {
            const item = docSnap.data();
            if (item.status === 'processing') {
                const lease = item.leaseExpiresAt;
                if (lease && lease.toMillis() > nowMillis) {
                    continue; // Active lease held by another instance
                }
            }
            if (item.attempts >= 3) {
                await docSnap.ref.update({ status: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                continue;
            }
            const pendingUids = Object.keys(item.recipients || {}).filter((u) => !item.recipients[u]?.delivered);
            if (pendingUids.length > 0) {
                await executeOutboxDelivery(db, item.id, {
                    streakId: item.streakId,
                    streakName: item.streakName,
                    title: item.title,
                    body: item.body,
                    targetUids: pendingUids,
                });
            }
            else {
                await docSnap.ref.update({ status: 'delivered', deliveredAt: admin.firestore.FieldValue.serverTimestamp() });
            }
        }
    }
    catch (retryErr) {
        console.warn('Outbox retry pass warning:', retryErr);
    }
    // Query active, at-risk, and frozen streaks for uninterrupted lifecycle evaluation
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
            let outboxEventId = '';
            let targetOutboxUids = [];
            let notifTitle = '';
            let notifBody = '';
            await db.runTransaction(async (t) => {
                const freshDoc = await t.get(streakDoc.ref);
                if (!freshDoc.exists)
                    return;
                const fresh = freshDoc.data();
                // Strict revalidation inside transaction to eliminate race conditions
                if (!['active', 'awaiting_checkin', 'at_risk', 'frozen'].includes(fresh.status)) {
                    return;
                }
                if (fresh.currentPeriodKey !== periodKey) {
                    return;
                }
                const freshEnd = fresh.currentPeriodEnd;
                if (!freshEnd || freshEnd.toMillis() > nowMillis) {
                    return;
                }
                if (fresh.lastExpiredPeriodKey === periodKey) {
                    return;
                }
                const freshCheckedIns = fresh.currentPeriodCheckIns || [];
                const freshMissing = participantUids.filter((uid) => !freshCheckedIns.includes(uid));
                if (freshMissing.length === 0) {
                    return; // Concurrent check-in completed in the interim
                }
                const currentFreezes = fresh.freezesRemaining ?? 0;
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
                    outboxEventId = `${streakDoc.id}_${periodKey}_freeze_protection`;
                    notifTitle = 'Streak Protected! ❄️';
                    notifBody = `A streak freeze protected your ${data.name} streak. You have ${newFreezes} freeze(s) remaining.`;
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
                    outboxEventId = `${streakDoc.id}_${periodKey}_streak_broken`;
                    notifTitle = `Streak Broken: ${data.name} 💔`;
                    notifBody = 'The check-in window closed. Restart together whenever you are ready!';
                }
                // Atomically claim outbox record inside the expiration transaction
                const claimRes = await claimOutboxRecord(db, outboxEventId, {
                    streakId: streakDoc.id,
                    streakName: data.name,
                    periodKey,
                    type: freezeApplied ? 'freeze_protection' : 'streak_broken',
                    title: notifTitle,
                    body: notifBody,
                    targetUids: participantUids,
                }, t);
                targetOutboxUids = claimRes.targetUids;
            });
            // Guaranteed delivery with retry tracking
            if (outboxEventId && targetOutboxUids.length > 0) {
                await executeOutboxDelivery(db, outboxEventId, {
                    streakId: streakDoc.id,
                    streakName: data.name,
                    title: notifTitle,
                    body: notifBody,
                    targetUids: targetOutboxUids,
                });
            }
            continue;
        }
        // 2. Final Urgent Warning: 30 minutes or less remaining
        if (remainingMinutes > 0 && remainingMinutes <= 30) {
            const outboxId = `${streakDoc.id}_${periodKey}_urgent_warning`;
            const claim = await claimOutboxRecord(db, outboxId, {
                streakId: streakDoc.id,
                streakName: data.name,
                periodKey,
                type: 'urgent_warning',
                title: `30 Minutes Left! Save ${data.name} 🔥`,
                body: `Your streak will break in 30 minutes. Complete your check-in now!`,
                targetUids: missingUids,
            });
            if (claim.claimed && claim.targetUids.length > 0) {
                await streakDoc.ref.update({
                    status: 'at_risk',
                    lastUrgentWarningPeriodKey: periodKey,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                await executeOutboxDelivery(db, outboxId, {
                    streakId: streakDoc.id,
                    streakName: data.name,
                    title: `30 Minutes Left! Save ${data.name} 🔥`,
                    body: `Your streak will break in 30 minutes. Complete your check-in now!`,
                    targetUids: claim.targetUids,
                });
            }
            continue;
        }
        // 3. Lead Reminder: 3 hours or less remaining
        if (remainingMinutes > 30 && remainingMinutes <= 180) {
            const displayHours = remainingMinutes > 60
                ? `${Math.floor(remainingMinutes / 60)} hours`
                : `${remainingMinutes} mins`;
            const outboxId = `${streakDoc.id}_${periodKey}_lead_reminder`;
            const claim = await claimOutboxRecord(db, outboxId, {
                streakId: streakDoc.id,
                streakName: data.name,
                periodKey,
                type: 'lead_reminder',
                title: `Save your ${data.name} streak ⏳`,
                body: `${displayHours} remaining to check in today. Don't let your streak break!`,
                targetUids: missingUids,
            });
            if (claim.claimed && claim.targetUids.length > 0) {
                await streakDoc.ref.update({
                    lastLeadReminderPeriodKey: periodKey,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                await executeOutboxDelivery(db, outboxId, {
                    streakId: streakDoc.id,
                    streakName: data.name,
                    title: `Save your ${data.name} streak ⏳`,
                    body: `${displayHours} remaining to check in today. Don't let your streak break!`,
                    targetUids: claim.targetUids,
                });
            }
        }
    }
});
//# sourceMappingURL=streakMonitor.js.map