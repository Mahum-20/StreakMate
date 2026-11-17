import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, cloudFunctions } from '@/core/config/firebase';
import { getRandomNudgePhrase } from '@/core/constants/nudgePhrases';

export interface NudgeRecord {
  id: string;
  streakId: string;
  streakName: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  phrase: string;
  read: boolean;
  createdAt: Timestamp | null;
}

export interface SendNudgeParams {
  streakId: string;
  streakName: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  customPhrase?: string;
}

export const nudgeService = {
  /**
   * Sends an entertaining Duolingo-style nudge to an accountability partner.
   * Delegates to the server-authoritative Cloud Function to enforce rate limits,
   * participant verification, and real-time push dispatch.
   */
  async sendNudge(params: SendNudgeParams): Promise<{ id: string; phrase: string }> {
    const chosenPhrase = params.customPhrase || getRandomNudgePhrase(params.toName, params.streakName).phrase;

    try {
      const callable = httpsCallable(cloudFunctions, 'sendNudge');
      const result = await callable({
        streakId: params.streakId,
        customPhrase: chosenPhrase,
      });
      const data = result.data as any;
      return { id: `streak_${params.streakId}_${Date.now()}`, phrase: data.phrase || chosenPhrase };
    } catch (err: any) {
      console.warn('sendNudge callable error:', err);
      throw err;
    }
  },

  /**
   * Subscribes to active, unread incoming nudges for the current user.
   */
  subscribeToIncomingNudges(
    userId: string,
    onUpdate: (nudges: NudgeRecord[]) => void
  ): Unsubscribe {
    if (!userId) return () => {};

    try {
      const nudgesRef = collection(db, 'nudges');
      const q = query(
        nudgesRef,
        where('toUid', '==', userId),
        where('read', '==', false)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const list: NudgeRecord[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              streakId: data.streakId || '',
              streakName: data.streakName || 'Streak',
              fromUid: data.fromUid || '',
              fromName: data.fromName || 'Your Friend',
              toUid: data.toUid || '',
              toName: data.toName || '',
              phrase: data.phrase || 'Your friend nudged you to check in!',
              read: data.read || false,
              createdAt: data.createdAt || null,
            };
          });
          onUpdate(list);
        },
        (err) => {
          // Soft warn without breaking execution
          console.warn('subscribeToIncomingNudges notice:', err?.message || err);
        }
      );
    } catch (err) {
      console.warn('Could not initialize standalone nudges listener:', err);
      return () => {};
    }
  },

  /**
   * Dismisses or marks a nudge as read once acknowledged or checked in.
   */
  async markNudgeRead(nudgeId: string): Promise<void> {
    if (nudgeId.startsWith('streak_')) {
      const parts = nudgeId.split('_');
      const streakId = parts[1];
      if (streakId) {
        try {
          const streakRef = doc(db, 'streaks', streakId);
          await updateDoc(streakRef, {
            lastNudgeDismissed: true,
          });
        } catch (e) {
          console.warn('Could not dismiss streak nudge:', e);
        }
      }
      return;
    }

    try {
      const nudgeRef = doc(db, 'nudges', nudgeId);
      await updateDoc(nudgeRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Could not mark standalone nudge as read:', e);
    }
  },
};
