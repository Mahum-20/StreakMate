import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { useAuthStore } from '@/store/useAuthStore';
import { Button, Card, EmptyState } from '@/components/common';
import { FriendCard } from '@/components/cards';
import { LivingSkyBackground } from '@/components/motion/LivingSkyBackground';
import { friendService, FriendRequest, Friendship } from '@/features/friends/services/friendService';

interface FriendItem {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  activeStreakCount: number;
}

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { skyConfig } = useSky();
  const { user } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubRequests = friendService.subscribeToIncomingRequests(user.uid, (requests) => {
      setPendingRequests(requests);
    });

    const unsubFriends = friendService.subscribeToFriendships(user.uid, (friendships: Friendship[]) => {
      const mapped: FriendItem[] = friendships.map((f) => {
        const friendUid = f.participantUids.find((uid) => uid !== user.uid) || '';
        const pData = f.participantData?.[friendUid];
        return {
          id: friendUid,
          displayName: pData?.displayName || 'Friend',
          username: pData?.username || 'friend',
          avatarUrl: pData?.avatarUrl || null,
          activeStreakCount: f.activeStreakCount || 0,
        };
      });
      setFriends(mapped);
      setLoading(false);
    });

    return () => {
      unsubRequests();
      unsubFriends();
    };
  }, [user?.uid]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!user) return;
    try {
      await friendService.acceptFriendRequest(request, {
        displayName: user.displayName || 'StreakMate User',
        username: user.username || 'user',
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to accept friend request.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendService.declineFriendRequest(requestId);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to decline friend request.');
    }
  };

  return (
    <LivingSkyBackground>
      {/* Top Floating Glass Header with generous breathing space */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.lg,
            backgroundColor: skyConfig.glassSurface,
            borderBottomColor: skyConfig.glassBorderBottom,
            borderBottomWidth: 1,
          },
        ]}
      >
        <View>
          <Text style={[typography.editorialTitle, { color: skyConfig.textPrimary }]}>Friends</Text>
          <Text style={[typography.caption, { color: skyConfig.textSecondary, marginTop: 2 }]}>
            Shared habits and bilateral accountability
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={skyConfig.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <View style={{ marginTop: spacing.base, marginBottom: spacing.md }}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
                Incoming Requests
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: skyConfig.badgeBg, borderRadius: borderRadius.full },
                ]}
              >
                <Text style={[typography.badge, { color: skyConfig.accent }]}>
                  {pendingRequests.length}
                </Text>
              </View>
            </View>

            {pendingRequests.map((req) => (
              <Card key={req.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
                    {req.fromDisplayName}
                  </Text>
                  <Text style={[typography.caption, { color: skyConfig.textSecondary }]}>
                    @{req.fromUsername} · Friend Request
                  </Text>
                </View>

                <View style={styles.requestActions}>
                  <Button
                    title="Accept"
                    size="sm"
                    variant="primary"
                    onPress={() => handleAcceptRequest(req)}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Button
                    title="Decline"
                    size="sm"
                    variant="secondary"
                    onPress={() => handleRejectRequest(req.id)}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Friends List Section */}
        <View style={[styles.sectionHeader, { marginTop: spacing.base }]}>
          <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
            All Friends ({friends.length})
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : friends.length > 0 ? (
          friends.map((friend) => (
            <FriendCard
              key={friend.id}
              id={friend.id}
              displayName={friend.displayName}
              username={friend.username}
              activeStreakCount={friend.activeStreakCount}
              onStartStreak={() => router.push('/streak/create')}
            />
          ))
        ) : (
          <EmptyState
            icon="people-outline"
            title="No Friends Added Yet"
            description="Streaks work best with partners. Add your first friend using their username."
            actionTitle="Find Friends"
            onActionPress={() => router.push('/friends/add')}
            actionStyle={{
              backgroundColor: skyConfig.phase === 'afternoon' ? '#FFFFFF' : skyConfig.accent,
              borderColor: skyConfig.phase === 'afternoon' ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
              borderWidth: skyConfig.phase === 'afternoon' ? 1 : 0,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: skyConfig.phase === 'afternoon' ? 0.12 : 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
            actionTextStyle={{
              color: skyConfig.phase === 'afternoon' ? '#0F172A' : skyConfig.accentForeground,
              fontWeight: '700',
            }}
            style={{ marginTop: spacing.xl }}
          />
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) for Add Friend in bottom right corner */}
      <TouchableOpacity
        onPress={() => router.push('/friends/add')}
        style={[
          styles.fabButton,
          {
            backgroundColor: skyConfig.phase === 'afternoon' ? '#FFFFFF' : skyConfig.accent,
            borderColor: skyConfig.phase === 'afternoon' ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
            borderWidth: skyConfig.phase === 'afternoon' ? 1 : 0,
            shadowColor: '#000000',
          },
        ]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add Friend"
      >
        <Ionicons
          name="person-add"
          size={26}
          color={skyConfig.phase === 'afternoon' ? '#0F172A' : skyConfig.accentForeground}
        />
      </TouchableOpacity>
    </LivingSkyBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fabButton: {
    position: 'absolute',
    bottom: 86,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  requestInfo: {
    flex: 1,
    marginRight: 10,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
