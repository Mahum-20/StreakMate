"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStreakNotification = sendStreakNotification;
const admin = require("firebase-admin");
async function sendStreakNotification(payload) {
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
    const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
    if (tokens.length === 0)
        return;
    const message = {
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
    const failedTokens = [];
    let transientError = null;
    response.responses.forEach((resp, index) => {
        if (!resp.success && resp.error) {
            const errCode = resp.error.code;
            if (errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered') {
                failedTokens.push(tokens[index]);
            }
            else {
                // Capture transient network / quota / server errors
                transientError = resp.error;
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
        await batch.commit().catch((err) => console.warn('Device token cleanup warning:', err));
    }
    // If all tokens failed, and failures include transient errors, throw so outbox retries!
    if (response.successCount === 0 && transientError) {
        throw new Error(`FCM delivery failure: ${transientError?.message || transientError?.code || 'Transient delivery error'}`);
    }
    return { success: true, deliveredCount: response.successCount };
}
//# sourceMappingURL=fcmDispatcher.js.map