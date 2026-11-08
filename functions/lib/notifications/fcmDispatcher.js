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
    response.responses.forEach((resp, index) => {
        if (!resp.success && resp.error) {
            const errCode = resp.error.code;
            if (errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered') {
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
//# sourceMappingURL=fcmDispatcher.js.map