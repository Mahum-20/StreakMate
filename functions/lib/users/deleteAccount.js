"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fcmDispatcher_1 = require("../notifications/fcmDispatcher");
/**
 * Server-authoritative, complete user account deletion workflow.
 * Cascades across all user data dependencies:
 * - Nested user subcollections (deviceTokens, notificationPreferences)
 * - Sent and received friend requests
 * - Mutual friendships
 * - Solo streaks (cascading deletion of subcollections)
 * - Partner streaks (gracefully archived/broken with partner notification)
 * - Social nudges
 * - Public username reservation index
 * - Firestore user profile document
 * - Firebase Auth user record
 */
exports.deleteUserAccount = functions.https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to delete your account.');
    }
    const uid = context.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    const username = userData?.username;
    const userDisplayName = userData?.displayName || 'Your partner';
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
    // 1. Mark account state as deleting for auditing and recovery
    await userRef.set({
        status: 'deleting',
        deletionJob: {
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            step: 'in_progress',
            attempts: admin.firestore.FieldValue.increment(1),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    try {
        // 2. Delete user subcollections
        await deleteQueryBatch(userRef.collection('deviceTokens'));
        await deleteQueryBatch(userRef.collection('notificationPreferences'));
        // 3. Delete friend requests (both sent and received)
        await deleteQueryBatch(db.collection('friendRequests').where('fromUid', '==', uid));
        await deleteQueryBatch(db.collection('friendRequests').where('toUid', '==', uid));
        // 4. Delete friendships
        await deleteQueryBatch(db.collection('friendships').where('participantUids', 'array-contains', uid));
        // 5. Handle streaks involving the user
        const userStreaksSnap = await db
            .collection('streaks')
            .where('participantUids', 'array-contains', uid)
            .get();
        for (const streakDoc of userStreaksSnap.docs) {
            const sData = streakDoc.data();
            const pUids = sData.participantUids || [];
            const isSolo = Boolean(sData.isSolo || pUids.length <= 1);
            if (isSolo) {
                // Cascade delete solo streaks
                await deleteQueryBatch(streakDoc.ref.collection('checkIns'));
                await deleteQueryBatch(streakDoc.ref.collection('history'));
                await deleteQueryBatch(db.collection('nudges').where('streakId', '==', streakDoc.id));
                await streakDoc.ref.delete();
            }
            else {
                // Shared partner streak: archive/break gracefully and notify partner
                const partnerUid = pUids.find((id) => id !== uid);
                await streakDoc.ref.update({
                    status: 'broken',
                    partnerLeft: true,
                    partnerLeftUid: uid,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                if (partnerUid) {
                    await (0, fcmDispatcher_1.sendStreakNotification)({
                        streakId: streakDoc.id,
                        streakName: sData.name || 'Shared Streak',
                        recipientUid: partnerUid,
                        title: 'Streak Archived 💔',
                        body: `${userDisplayName} has deleted their account. Your shared streak has been archived.`,
                    }).catch((err) => console.warn('Partner notification failure on account deletion:', err));
                }
            }
        }
        // 6. Delete nudges involving the user
        await deleteQueryBatch(db.collection('nudges').where('fromUid', '==', uid));
        await deleteQueryBatch(db.collection('nudges').where('toUid', '==', uid));
        // 7. Release username reservation
        if (username) {
            await db.collection('usernames').doc(username).delete().catch(() => { });
        }
        // 8. Delete user profile document
        await userRef.delete();
        // 9. Delete Firebase Auth user record
        await admin.auth().deleteUser(uid);
        return { success: true };
    }
    catch (err) {
        // Record failed step
        await userRef.set({
            deletionJob: {
                step: 'failed',
                lastError: err?.message || 'Account deletion failed',
                failedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }).catch(() => { });
        throw new functions.https.HttpsError('internal', `Account deletion encountered an error: ${err?.message || err}. Re-calling will safely resume cleanup.`);
    }
});
//# sourceMappingURL=deleteAccount.js.map