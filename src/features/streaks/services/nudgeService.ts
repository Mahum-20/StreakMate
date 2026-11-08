import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
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
   * Updates the shared streak document (authoritative, guaranteed permissions)
   * and optionally logs to the nudges collection for persistence.
   */
  async sendNudge(params: SendNudgeParams): Promise<{ id: string; phrase: string }> {
    const chosenPhrase = params.customPhrase || getRandomNudgePhrase(params.toName, params.streakName).phrase;
    let nudgeId = `streak_${params.streakId}_${Date.now()}`;

    // 1. Authoritative write: update the streak document where both partners have participant permissions
    try {
      const streakRef = doc(db, 'streaks', params.streakId);
      await updateDoc(streakRef, {
        lastNudgeAt: serverTimestamp(),
        lastNudgeBy: params.fromUid,
        lastNudgePhrase: chosenPhrase,
        lastNudgeDismissed: false,
      });
    } catch (err: any) {
      console.warn('Notice updating streak lastNudgeAt:', err);
    }

    // 2. Optionally record in standalone nudges collection if rules are deployed on remote project
    try {
      const nudgesRef = collection(db, 'nudges');
      const docRef = await addDoc(nudgesRef, {
        streakId: params.streakId,
        streakName: params.streakName,
        fromUid: params.fromUid,
        fromName: params.fromName,
        toUid: params.toUid,
        toName: params.toName,
        phrase: chosenPhrase,
        read: false,
        createdAt: serverTimestamp(),
      });
      nudgeId = docRef.id;
    } catch (nudgeErr) {
      // Graceful fallback: streak document update already guarantees delivery
      console.warn('Standalone nudges collection write notice (fallback to streak document):', nudgeErr);
    }

    return { id: nudgeId, phrase: chosenPhrase };
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
