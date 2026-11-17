import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Production-safe recursive cascading deletion of streaks.
 * Eliminates orphaned documents by deleting subcollections (checkIns, history)
 * and related social nudges in paginated batches before deleting the streak document.
 */
export const deleteStreak = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to delete a streak.'
    );
  }

  const { streakId } = data;
  if (!streakId || typeof streakId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid streakId is required.'
    );
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const streakRef = db.collection('streaks').doc(streakId);

  const streakSnap = await streakRef.get();
  if (!streakSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Streak not found.');
  }

  const streakData = streakSnap.data()!;
  const participantUids: string[] = streakData.participantUids || [];
  const creatorUid: string = streakData.creatorUid;

  if (creatorUid !== uid && !participantUids.includes(uid)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You do not have permission to delete this streak.'
    );
  }

  // Set status to 'deleting' immediately to block concurrent check-ins, nudges, and monitor jobs
  await streakRef.update({
    status: 'deleting',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Helper: batch delete a query in chunks of up to 400 docs
  const deleteQueryBatch = async (query: admin.firestore.Query): Promise<void> => {
    while (true) {
      const snapshot = await query.limit(400).get();
      if (snapshot.empty) break;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      if (snapshot.size < 400) break;
    }
  };

  // 1. Delete all check-in receipt documents in subcollection
  await deleteQueryBatch(streakRef.collection('checkIns'));

  // 2. Delete all history log documents in subcollection
  await deleteQueryBatch(streakRef.collection('history'));

  // 3. Delete related nudges
  const nudgesQuery = db.collection('nudges').where('streakId', '==', streakId);
  await deleteQueryBatch(nudgesQuery);

  // 4. Finally delete the parent streak document
  await streakRef.delete();

  return { success: true };
});
