import * as admin from 'firebase-admin';

export interface StreakNotificationPayload {
  streakId: string;
  streakName: string;
  recipientUid: string;
  title: string;
  body: string;
  channelId?: string;
}

export async function sendStreakNotification(payload: StreakNotificationPayload) {
  const db = admin.firestore();
  const messaging = admin.messaging();

  // Retrieve user device tokens
  const tokensSnap = await db
    .collection('users')
    .doc(payload.recipientUid)
    .collection('deviceTokens')
    .get();

  if (tokensSnap.empty) {
    return;
  }

  const tokens = tokensSnap.docs.map((d) => d.data().token as string).filter(Boolean);
  if (tokens.length === 0) return;

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      streakId: payload.streakId,
      screen: 'streak_detail',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: payload.channelId || 'streak_reminders',
        sound: 'default',
        icon: 'ic_notification',
        color: '#FF6B4A',
      },
    },
  };

  const response = await messaging.sendEachForMulticast(message);

  // Clean up invalid or stale tokens
  const failedTokens: string[] = [];
  response.responses.forEach((resp, index) => {
    if (!resp.success && resp.error) {
      const errCode = resp.error.code;
      if (
        errCode === 'messaging/invalid-registration-token' ||
        errCode === 'messaging/registration-token-not-registered'
      ) {
        failedTokens.push(tokens[index]);
      }
    }
  });

  if (failedTokens.length > 0) {
    const batch = db.batch();
    tokensSnap.docs.forEach((d) => {
      if (failedTokens.includes(d.data().token)) {
        batch.delete(d.ref);
      }
    });
    await batch.commit();
  }
}
