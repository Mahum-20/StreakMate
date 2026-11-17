import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendStreakNotification } from '../notifications/fcmDispatcher';

/**
 * Server-authoritative friend request acceptance.
 * Atomically verifies that the caller is the true recipient of a pending friend request,
 * marks the request accepted, and provisions the mutual friendship document.
 */
export const acceptFriendRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to accept a friend request.'
    );
  }

  const { requestId } = data;
  if (!requestId || typeof requestId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid requestId is required.'
    );
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const requestRef = db.collection('friendRequests').doc(requestId);

  let fromUid = '';

  await db.runTransaction(async (transaction) => {
    const reqSnap = await transaction.get(requestRef);
    if (!reqSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Friend request not found.');
    }

    const reqData = reqSnap.data()!;
    if (reqData.toUid !== uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only the recipient can accept this friend request.'
      );
    }

    fromUid = reqData.fromUid;
    const sorted = [fromUid, uid].sort();
    const friendshipId = `${sorted[0]}_${sorted[1]}`;
    const friendshipRef = db.collection('friendships').doc(friendshipId);

    // If already marked accepted, guarantee that the mutual friendship document actually exists
    if (reqData.status === 'accepted') {
      const friendshipSnap = await transaction.get(friendshipRef);
      if (!friendshipSnap.exists) {
        // Self-heal missing friendship document
        transaction.set(
          friendshipRef,
          {
            id: friendshipId,
            participantUids: [sorted[0], sorted[1]],
            activeStreakCount: 0,
            establishedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      return; // Already processed and verified
    }

    if (reqData.status !== 'pending') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Cannot accept a friend request with status "${reqData.status}".`
      );
    }

    // Mark friend request as accepted
    transaction.update(requestRef, {
      status: 'accepted',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create mutual friendship with deterministic sorted ID
    transaction.set(
      friendshipRef,
      {
        id: friendshipId,
        participantUids: [sorted[0], sorted[1]],
        activeStreakCount: 0,
        establishedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  if (fromUid) {
    await sendStreakNotification({
      streakId: '',
      streakName: 'StreakMate Friends',
      recipientUid: fromUid,
      title: 'Friend Request Accepted! 🎉',
      body: 'Your friend request was accepted. You can now start partner streaks together!',
    }).catch((err) => console.warn('Friend acceptance notification error:', err));
  }

  return { success: true };
});
