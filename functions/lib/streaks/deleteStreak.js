"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStreak = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
/**
 * Production-safe recursive cascading deletion of streaks.
 * Eliminates orphaned documents by deleting subcollections (checkIns, history)
 * and related social nudges in paginated batches before deleting the streak document.
 */
exports.deleteStreak = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to delete a streak.');
    }
    const { streakId } = data;
    if (!streakId || typeof streakId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'A valid streakId is required.');
    }
    const uid = context.auth.uid;
    const db = admin.firestore();
    const streakRef = db.collection('streaks').doc(streakId);
    const streakSnap = await streakRef.get();
    if (!streakSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Streak not found.');
    }
    const streakData = streakSnap.data();
    const creatorUid = streakData.creatorUid;
    // Strict ownership: only the creator can permanently delete a streak
    if (creatorUid !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Only the streak creator can permanently delete this streak.');
    }
    // Set status to 'deleting' and record deletion job state for recovery & auditing
    await streakRef.set({
        status: 'deleting',
        deletionJob: {
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            initiatedBy: uid,
            step: 'in_progress',
            attempts: admin.firestore.FieldValue.increment(1),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // Helper: batch delete a query in chunks of up to 400 docs
    const deleteQueryBatch = async (query) => {
        while (true) {
            const snapshot = await query.limit(400).get();
            if (snapshot.empty)
                break;
            const batch = db.batch();
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            if (snapshot.size < 400)
                break;
        }
    };
    try {
        // 1. Delete all check-in receipt documents in subcollection
        await deleteQueryBatch(streakRef.collection('checkIns'));
        // 2. Delete all history log documents in subcollection
        await deleteQueryBatch(streakRef.collection('history'));
        // 3. Delete related nudges
        const nudgesQuery = db.collection('nudges').where('streakId', '==', streakId);
        await deleteQueryBatch(nudgesQuery);
        // 4. Finally delete the parent streak document
        await streakRef.delete();
    }
    catch (err) {
        // Mark deletion failure state so user/client can inspect and safely re-invoke to finish cleanup
        await streakRef.set({
            deletionJob: {
                step: 'failed',
                lastError: err?.message || 'Streak deletion interrupted',
                failedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }).catch(() => { });
        throw new functions.https.HttpsError('internal', `Streak deletion interrupted: ${err?.message || err}. Re-calling will safely resume cleanup.`);
    }
    return { success: true };
});
//# sourceMappingURL=deleteStreak.js.map