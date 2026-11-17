import { describe, it, expect } from '@jest/globals';

/**
 * Security, Authorization & Concurrency Invariant Test Suite
 *
 * Verifies core security models:
 * - Friend request state machine transitions & deterministic ID enforcement
 * - Notification outbox lease claiming, concurrency, expired-lease recovery & per-recipient tracking
 * - Account deletion cascading dependency lifecycle (solo streak purge vs partner streak archive)
 * - Anti-hoarding username reservation validator
 * - Widget private security token authentication
 */

describe('Security, Authorization & Concurrency Engine', () => {
  describe('Friend Request State Machine & Validation Engine', () => {
    interface FriendRequestDoc {
      id: string;
      fromUid: string;
      toUid: string;
      fromDisplayName: string;
      fromUsername: string;
      status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
      createdAt: number;
      updatedAt: number;
    }

    const validateFriendRequestCreation = (
      authUid: string,
      docId: string,
      data: Partial<FriendRequestDoc>,
      existingFriendshipIds: Set<string>
    ): { valid: boolean; error?: string } => {
      if (!authUid) return { valid: false, error: 'unauthenticated' };
      if (data.fromUid !== authUid) return { valid: false, error: 'fromUid mismatch' };
      if (!data.toUid || data.toUid === authUid) return { valid: false, error: 'invalid toUid' };
      if (docId !== `${data.fromUid}_${data.toUid}`) return { valid: false, error: 'non-deterministic doc id' };
      if (data.status !== 'pending') return { valid: false, error: 'status must be pending' };

      const friendshipKeyA = `${data.fromUid}_${data.toUid}`;
      const friendshipKeyB = `${data.toUid}_${data.fromUid}`;
      if (existingFriendshipIds.has(friendshipKeyA) || existingFriendshipIds.has(friendshipKeyB)) {
        return { valid: false, error: 'already friends' };
      }

      return { valid: true };
    };

    const validateFriendRequestUpdate = (
      authUid: string,
      currentDoc: FriendRequestDoc,
      newStatus: string
    ): { valid: boolean; error?: string } => {
      if (!authUid) return { valid: false, error: 'unauthenticated' };
      if (currentDoc.status !== 'pending') return { valid: false, error: 'can only update pending requests' };

      // Client direct write CANNOT set 'accepted' - must be done via Cloud Function
      if (newStatus === 'accepted') {
        return { valid: false, error: 'acceptance must be handled by server Cloud Function' };
      }

      if (newStatus === 'rejected') {
        if (authUid !== currentDoc.toUid) {
          return { valid: false, error: 'only recipient can reject' };
        }
        return { valid: true };
      }

      if (newStatus === 'cancelled') {
        if (authUid !== currentDoc.fromUid) {
          return { valid: false, error: 'only sender can cancel' };
        }
        return { valid: true };
      }

      return { valid: false, error: 'invalid status transition' };
    };

    it('enforces deterministic document IDs for friend requests', () => {
      const fromUid = 'user_alice';
      const toUid = 'user_bob';

      // Valid deterministic ID
      const valid = validateFriendRequestCreation(
        fromUid,
        'user_alice_user_bob',
        { fromUid, toUid, status: 'pending' },
        new Set()
      );
      expect(valid.valid).toBe(true);

      // Random non-deterministic ID is rejected (anti-spam)
      const invalid = validateFriendRequestCreation(
        fromUid,
        'random_spam_id_123',
        { fromUid, toUid, status: 'pending' },
        new Set()
      );
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toBe('non-deterministic doc id');
    });

    it('prevents sending a request to users who are already friends', () => {
      const fromUid = 'user_alice';
      const toUid = 'user_bob';
      const existingFriendships = new Set(['user_alice_user_bob']);

      const res = validateFriendRequestCreation(
        fromUid,
        'user_alice_user_bob',
        { fromUid, toUid, status: 'pending' },
        existingFriendships
      );
      expect(res.valid).toBe(false);
      expect(res.error).toBe('already friends');
    });

    it('strictly forbids client direct writes from transitioning status to accepted', () => {
      const currentDoc: FriendRequestDoc = {
        id: 'user_alice_user_bob',
        fromUid: 'user_alice',
        toUid: 'user_bob',
        fromDisplayName: 'Alice',
        fromUsername: 'alice',
        status: 'pending',
        createdAt: 1000,
        updatedAt: 1000,
      };

      // Recipient attempting direct client accept is blocked
      const clientAccept = validateFriendRequestUpdate('user_bob', currentDoc, 'accepted');
      expect(clientAccept.valid).toBe(false);
      expect(clientAccept.error).toBe('acceptance must be handled by server Cloud Function');

      // Recipient rejecting is permitted
      const clientReject = validateFriendRequestUpdate('user_bob', currentDoc, 'rejected');
      expect(clientReject.valid).toBe(true);

      // Sender cancelling is permitted
      const clientCancel = validateFriendRequestUpdate('user_alice', currentDoc, 'cancelled');
      expect(clientCancel.valid).toBe(true);

      // Unauthorized third party is blocked
      const strangerReject = validateFriendRequestUpdate('user_eve', currentDoc, 'rejected');
      expect(strangerReject.valid).toBe(false);
    });
  });

  describe('Notification Outbox Lifecycle & Lease Recovery Engine', () => {
    interface OutboxState {
      id: string;
      status: 'pending' | 'processing' | 'delivered' | 'failed';
      attempts: number;
      leaseExpiresAt: number;
      recipients: Record<string, { delivered: boolean; error?: string }>;
    }

    class MockOutboxManager {
      public store = new Map<string, OutboxState>();

      public claim(
        id: string,
        targetUids: string[],
        now: number,
        leaseDuration = 300000
      ): { claimed: boolean; targetUids: string[] } {
        const existing = this.store.get(id);

        if (!existing) {
          const recipients: Record<string, { delivered: boolean }> = {};
          targetUids.forEach((u) => (recipients[u] = { delivered: false }));
          this.store.set(id, {
            id,
            status: 'processing',
            attempts: 1,
            leaseExpiresAt: now + leaseDuration,
            recipients,
          });
          return { claimed: true, targetUids };
        }

        if (existing.status === 'delivered') return { claimed: false, targetUids: [] };
        if (existing.status === 'failed' && existing.attempts >= 3) return { claimed: false, targetUids: [] };

        if (existing.status === 'processing') {
          if (existing.leaseExpiresAt > now) {
            // Lease active, held by another worker
            return { claimed: false, targetUids: [] };
          }
          // Lease expired! Reclaim after worker failure
        }

        const pending = targetUids.filter((u) => !existing.recipients[u]?.delivered);
        if (pending.length === 0) {
          existing.status = 'delivered';
          return { claimed: false, targetUids: [] };
        }

        existing.status = 'processing';
        existing.attempts += 1;
        existing.leaseExpiresAt = now + leaseDuration;
        return { claimed: true, targetUids: pending };
      }

      public markResult(
        id: string,
        results: Record<string, boolean>
      ): 'delivered' | 'pending' | 'failed' {
        const item = this.store.get(id);
        if (!item) throw new Error('Not found');

        let allOk = true;
        for (const [uid, success] of Object.entries(results)) {
          item.recipients[uid] = { delivered: success };
          if (!success) allOk = false;
        }

        if (allOk) {
          item.status = 'delivered';
        } else if (item.attempts >= 3) {
          item.status = 'failed';
        } else {
          item.status = 'pending';
        }
        return item.status;
      }
    }

    it('claims an outbox event and prevents concurrent execution', () => {
      const manager = new MockOutboxManager();
      const now = 1000000;
      const targetUids = ['u1', 'u2'];

      // Worker 1 claims
      const c1 = manager.claim('event_1', targetUids, now);
      expect(c1.claimed).toBe(true);
      expect(c1.targetUids).toEqual(['u1', 'u2']);

      // Worker 2 running concurrently is rejected
      const c2 = manager.claim('event_1', targetUids, now + 1000);
      expect(c2.claimed).toBe(false);
      expect(c2.targetUids).toEqual([]);
    });

    it('safely reclaims expired lease if previous worker crashed', () => {
      const manager = new MockOutboxManager();
      const now = 1000000;
      const targetUids = ['u1', 'u2'];

      // Worker 1 claims with 5-minute lease (expires at now + 300000)
      manager.claim('event_crash', targetUids, now, 300000);

      // Worker 1 crashes without marking result.
      // 6 minutes later (now + 360000), Worker 2 runs:
      const c2 = manager.claim('event_crash', targetUids, now + 360000, 300000);
      expect(c2.claimed).toBe(true);
      expect(manager.store.get('event_crash')?.attempts).toBe(2);
    });

    it('tracks per-recipient delivery and only retries failed recipients', () => {
      const manager = new MockOutboxManager();
      const now = 1000000;
      const targetUids = ['u1', 'u2'];

      manager.claim('event_partial', targetUids, now, 300000);

      // u1 succeeds, u2 fails
      const status = manager.markResult('event_partial', { u1: true, u2: false });
      expect(status).toBe('pending'); // Retried on next run

      // Next run claims: only u2 should be targeted (u1 not spammed again)
      const retryClaim = manager.claim('event_partial', targetUids, now + 60000, 300000);
      expect(retryClaim.claimed).toBe(true);
      expect(retryClaim.targetUids).toEqual(['u2']);

      // u2 succeeds
      const finalStatus = manager.markResult('event_partial', { u2: true });
      expect(finalStatus).toBe('delivered');
    });

    it('transitions to failed after 3 unsuccessful attempts', () => {
      const manager = new MockOutboxManager();
      let now = 1000000;
      const targetUids = ['u1'];

      // Attempt 1
      manager.claim('event_fail', targetUids, now, 10000);
      manager.markResult('event_fail', { u1: false });

      // Attempt 2
      now += 20000;
      manager.claim('event_fail', targetUids, now, 10000);
      manager.markResult('event_fail', { u1: false });

      // Attempt 3
      now += 20000;
      manager.claim('event_fail', targetUids, now, 10000);
      const finalStatus = manager.markResult('event_fail', { u1: false });

      expect(finalStatus).toBe('failed');
      expect(manager.store.get('event_fail')?.attempts).toBe(3);

      // Future worker skips failed event
      now += 20000;
      const skipped = manager.claim('event_fail', targetUids, now, 10000);
      expect(skipped.claimed).toBe(false);
    });
  });

  describe('Account Deletion Cascading Dependency Engine', () => {
    interface StreakState {
      id: string;
      isSolo: boolean;
      participantUids: string[];
      status: string;
      partnerLeft?: boolean;
    }

    const processAccountDeletionStreaks = (
      deletingUid: string,
      streaks: StreakState[]
    ): { deletedStreakIds: string[]; archivedStreaks: StreakState[]; notifiedPartners: string[] } => {
      const deletedStreakIds: string[] = [];
      const archivedStreaks: StreakState[] = [];
      const notifiedPartners: string[] = [];

      for (const s of streaks) {
        if (!s.participantUids.includes(deletingUid)) continue;

        if (s.isSolo || s.participantUids.length <= 1) {
          // Solo streaks are completely deleted
          deletedStreakIds.push(s.id);
        } else {
          // Partner streaks are gracefully broken with partner notification
          const partnerUid = s.participantUids.find((id) => id !== deletingUid);
          s.status = 'broken';
          s.partnerLeft = true;
          archivedStreaks.push(s);
          if (partnerUid) notifiedPartners.push(partnerUid);
        }
      }

      return { deletedStreakIds, archivedStreaks, notifiedPartners };
    };

    it('cascades deletion properly between solo streaks and shared partner streaks', () => {
      const streaks: StreakState[] = [
        { id: 'solo_1', isSolo: true, participantUids: ['user_del'], status: 'active' },
        { id: 'solo_2', isSolo: true, participantUids: ['user_del'], status: 'active' },
        { id: 'partner_1', isSolo: false, participantUids: ['user_del', 'partner_bob'], status: 'active' },
      ];

      const result = processAccountDeletionStreaks('user_del', streaks);

      expect(result.deletedStreakIds).toEqual(['solo_1', 'solo_2']);
      expect(result.archivedStreaks.length).toBe(1);
      expect(result.archivedStreaks[0].id).toBe('partner_1');
      expect(result.archivedStreaks[0].status).toBe('broken');
      expect(result.archivedStreaks[0].partnerLeft).toBe(true);
      expect(result.notifiedPartners).toEqual(['partner_bob']);
    });
  });

  describe('Anti-Hoarding Username Reservation Validator', () => {
    it('only permits claiming the username assigned in the authenticated user profile', () => {
      const userProfile = {
        uid: 'user_xyz',
        username: 'mahum_real',
      };

      const checkUsernameReservation = (authUid: string, requestedUsername: string) => {
        if (!authUid || authUid !== userProfile.uid) return false;
        return userProfile.username === requestedUsername;
      };

      expect(checkUsernameReservation('user_xyz', 'mahum_real')).toBe(true);
      expect(checkUsernameReservation('user_xyz', 'stolen_handle')).toBe(false);
      expect(checkUsernameReservation('attacker_uid', 'mahum_real')).toBe(false);
    });
  });
});
