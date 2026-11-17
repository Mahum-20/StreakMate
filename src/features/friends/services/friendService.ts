import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, cloudFunctions } from '@/core/config/firebase';

export interface UserSearchResult {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromDisplayName: string;
  fromUsername: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Timestamp | null;
}

export interface Friendship {
  id: string;
  participantUids: string[];
  participantData?: Record<string, { displayName: string; username: string; avatarUrl: string | null }>;
  establishedAt: Timestamp | null;
  activeStreakCount: number;
}

export const friendService = {
  /**
   * Searches for an exact username in the usernames index collection.
   */
  async searchUserByUsername(username: string): Promise<UserSearchResult | null> {
    const clean = username.trim().toLowerCase().replace('@', '');
    if (!clean) return null;

    const usernameDoc = await getDoc(doc(db, 'usernames', clean));
    if (!usernameDoc.exists()) {
      return null;
    }

    const data = usernameDoc.data();
    return {
      uid: data.uid,
      displayName: data.displayName || 'StreakMate User',
      username: data.username || clean,
      avatarUrl: data.avatarUrl || null,
    };
  },

  /**
   * Sends a friend request to a target user.
   */
  async sendFriendRequest(params: {
    fromUid: string;
    fromDisplayName: string;
    fromUsername: string;
    toUid: string;
  }): Promise<void> {
    const requestId = `${params.fromUid}_${params.toUid}`;
    const requestRef = doc(db, 'friendRequests', requestId);

    await setDoc(requestRef, {
      id: requestId,
      fromUid: params.fromUid,
      toUid: params.toUid,
      fromDisplayName: params.fromDisplayName,
      fromUsername: params.fromUsername,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Subscribes in real-time to incoming pending friend requests.
   */
  subscribeToIncomingRequests(
    userId: string,
    onUpdate: (requests: FriendRequest[]) => void
  ): Unsubscribe {
    const requestsRef = collection(db, 'friendRequests');
    const q = query(
      requestsRef,
      where('toUid', '==', userId),
      where('status', '==', 'pending')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const requests: FriendRequest[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            fromUid: data.fromUid,
            toUid: data.toUid,
            fromDisplayName: data.fromDisplayName || 'Friend',
            fromUsername: data.fromUsername || '',
            status: data.status,
            createdAt: data.createdAt || null,
          };
        });
        onUpdate(requests);
      },
      (err) => console.warn('subscribeToIncomingRequests error:', err)
    );
  },

  /**
   * Accepts an incoming friend request and creates the mutual friendship document.
   * Strictly server-authoritative via Cloud Function to ensure genuine recipient acceptance
   * and prevent any unauthorized client friendship provisioning.
   */
  async acceptFriendRequest(request: FriendRequest, _currentUser?: { displayName: string; username: string }): Promise<void> {
    const callable = httpsCallable(cloudFunctions, 'acceptFriendRequest');
    await callable({ requestId: request.id });
  },

  /**
   * Declines a friend request.
   */
  async declineFriendRequest(requestId: string): Promise<void> {
    const reqRef = doc(db, 'friendRequests', requestId);
    await setDoc(reqRef, { status: 'rejected', updatedAt: serverTimestamp() }, { merge: true });
  },

  /**
   * Subscribes to all active friendships for the user.
   */
  subscribeToFriendships(
    userId: string,
    onUpdate: (friendships: Friendship[]) => void
  ): Unsubscribe {
    const friendshipsRef = collection(db, 'friendships');
    const q = query(friendshipsRef, where('participantUids', 'array-contains', userId));

    return onSnapshot(
      q,
      (snapshot) => {
        const friendships: Friendship[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            participantUids: data.participantUids || [],
            participantData: data.participantData || {},
            establishedAt: data.establishedAt || null,
            activeStreakCount: data.activeStreakCount || 0,
          };
        });
        onUpdate(friendships);
      },
      (err) => console.warn('subscribeToFriendships error:', err)
    );
  },
};
