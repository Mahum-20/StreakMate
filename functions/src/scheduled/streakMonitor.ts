import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendStreakNotification } from '../notifications/fcmDispatcher';
import { calculatePeriodKey } from '../streaks/streakLogic';

export const monitorStreakExpirations = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const nowMillis = now.toMillis();

    // Query active and at-risk streaks
    const activeStreaksSnap = await db
      .collection('streaks')
      .where('status', 'in', ['active', 'awaiting_checkin', 'at_risk'])
      .get();

    for (const streakDoc of activeStreaksSnap.docs) {
      const data = streakDoc.data();
      const currentPeriodEnd = data.currentPeriodEnd as admin.firestore.Timestamp | undefined;
      if (!currentPeriodEnd) continue;

      const endMillis = currentPeriodEnd.toMillis();
      const remainingMinutes = Math.floor((endMillis - nowMillis) / (1000 * 60));
      const participantUids: string[] = data.participantUids || [];
      const checkedInUids: string[] = data.currentPeriodCheckIns || [];
      const missingUids = participantUids.filter((uid) => !checkedInUids.includes(uid));

      const tz = data.timezone || 'UTC';
      const periodKey = data.currentPeriodKey || calculatePeriodKey(new Date(), tz);

      // If everyone already checked in for this period, nothing to remind or expire
      if (missingUids.length === 0) {
        continue;
      }

      // 1. Expiration check: Deadline passed and not all participants checked in
      if (remainingMinutes <= 0) {
        const freezes = data.freezesRemaining ?? 0;

        if (freezes > 0) {
          // Streak Freeze Protection
          const newFreezes = freezes - 1;
          await db.runTransaction(async (t) => {
            t.update(streakDoc.ref, {
              status: 'frozen',
              freezesRemaining: newFreezes,
              lastExpiredPeriodKey: periodKey,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const histRef = streakDoc.ref.collection('history').doc(periodKey);
            t.set(histRef, {
              periodKey,
              completed: false,
              checkedInUids,
              missingUids,
              finalStreakCount: data.currentStreak || 0,
              usedFreeze: true,
              finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          // Notify participants that streak was saved by freeze
          for (const uid of participantUids) {
            await sendStreakNotification({
              streakId: streakDoc.id,
              streakName: data.name,
              recipientUid: uid,
              title: `Streak Protected! ❄️`,
              body: `A streak freeze protected your ${data.name} streak. You have ${newFreezes} freeze(s) remaining.`,
            }).catch((err) => console.warn('Freeze notification failure', err));
          }
        } else {
          // Missed deadline with zero freezes remaining -> Streak breaks
          await db.runTransaction(async (t) => {
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
              checkedInUids,
              missingUids,
              finalStreakCount: 0,
              usedFreeze: false,
              finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          // Notify participants that streak broke
          for (const uid of participantUids) {
            await sendStreakNotification({
              streakId: streakDoc.id,
              streakName: data.name,
              recipientUid: uid,
              title: `Streak Broken: ${data.name} 💔`,
              body: `The check-in window closed. Restart together whenever you are ready!`,
            }).catch((err) => console.warn('Notification failure', err));
          }
        }
        continue;
      }

      // 2. Final Urgent Warning: 30 minutes or less remaining (Deduplicated per period)
      if (remainingMinutes > 0 && remainingMinutes <= 30) {
        if (data.lastUrgentWarningPeriodKey === periodKey) {
          // Already sent final warning for this period
          continue;
        }

        await streakDoc.ref.update({
          status: 'at_risk',
          lastUrgentWarningPeriodKey: periodKey,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        for (const uid of missingUids) {
          await sendStreakNotification({
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
          // Already sent lead reminder for this period
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
          await sendStreakNotification({
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
