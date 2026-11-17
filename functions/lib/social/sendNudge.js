"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNudge = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fcmDispatcher_1 = require("../notifications/fcmDispatcher");
/**
 * Server-authoritative nudge submission.
 * Enforces participant validation, mutual partner streak verification,
 * and 15-minute anti-spam cooldown between nudges from the same user.
 */
exports.sendNudge = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to send a nudge.');
    }
    const { streakId, customPhrase } = data;
    if (!streakId || typeof streakId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'A valid streakId is required.');
    }
    const fromUid = context.auth.uid;
    const db = admin.firestore();
    const streakRef = db.collection('streaks').doc(streakId);
    let recipientUid = '';
    let streakName = 'Streak';
    const phrase = (customPhrase && typeof customPhrase === 'string')
        ? customPhrase.slice(0, 200)
        : 'Time to check in and keep our streak alive! 🔥';
    await db.runTransaction(async (transaction) => {
        const streakDoc = await transaction.get(streakRef);
        if (!streakDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Streak not found.');
        }
        const streakData = streakDoc.data();
        if (streakData.status === 'deleting' || streakData.status === 'broken') {
            throw new functions.https.HttpsError('failed-precondition', `Cannot nudge on a ${streakData.status} streak.`);
        }
        const participantUids = streakData.participantUids || [];
        if (!participantUids.includes(fromUid)) {
            throw new functions.https.HttpsError('permission-denied', 'You are not a participant in this streak.');
        }
        if (streakData.isSolo || participantUids.length < 2) {
            throw new functions.https.HttpsError('failed-precondition', 'Cannot send nudges in a solo streak.');
        }
        recipientUid = participantUids.find((id) => id !== fromUid) || '';
        if (!recipientUid) {
            throw new functions.https.HttpsError('not-found', 'Partner not found.');
        }
        streakName = streakData.name || 'Streak';
        // Anti-spam cooldown: enforce 15 minutes between nudges from the same sender
        const lastNudgeAt = streakData.lastNudgeAt;
        const lastNudgeBy = streakData.lastNudgeBy;
        if (lastNudgeAt && lastNudgeBy === fromUid) {
            const elapsedMinutes = (Date.now() - lastNudgeAt.toMillis()) / (1000 * 60);
            if (elapsedMinutes < 15) {
                const remainingMinutes = Math.ceil(15 - elapsedMinutes);
                throw new functions.https.HttpsError('resource-exhausted', `Please wait ${remainingMinutes} minute(s) before nudging again.`);
            }
        }
        // Update streak document with authoritative nudge fields
        transaction.update(streakRef, {
            lastNudgeAt: admin.firestore.FieldValue.serverTimestamp(),
            lastNudgeBy: fromUid,
            lastNudgePhrase: phrase,
            lastNudgeDismissed: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Write immutable nudge receipt into top-level nudges collection
        const nudgeRef = db.collection('nudges').doc();
        transaction.set(nudgeRef, {
            id: nudgeRef.id,
            streakId,
            streakName,
            fromUid,
            toUid: recipientUid,
            phrase,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    // Dispatch push notification to recipient
    await (0, fcmDispatcher_1.sendStreakNotification)({
        streakId,
        streakName,
        recipientUid,
        title: `StreakMate Nudge! 👀`,
        body: phrase,
    }).catch((err) => console.warn('Nudge notification error:', err));
    return { success: true, phrase };
});
//# sourceMappingURL=sendNudge.js.map