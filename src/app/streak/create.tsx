import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { useAuthStore } from '@/store/useAuthStore';
import { Button, Input, Card, Avatar } from '@/components/common';
import { LivingSkyBackground } from '@/components/motion/LivingSkyBackground';
import { streakService } from '@/features/streaks/services/streakService';
import { friendService, Friendship } from '@/features/friends/services/friendService';

interface FriendOption {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export default function CreateStreakModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { skyConfig } = useSky();
  const { user } = useAuthStore();

  const [mode, setMode] = useState<'solo' | 'friend'>('solo');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [selectedFriendUid, setSelectedFriendUid] = useState<string>('');
  const [reminderLead, setReminderLead] = useState<number>(3); // 3 hours default
  const [loading, setLoading] = useState(false);
  const [fetchingFriends, setFetchingFriends] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load real friends from Firestore
  useEffect(() => {
    if (!user?.uid) {
      setFetchingFriends(false);
      return;
    }

    const unsubscribe = friendService.subscribeToFriendships(user.uid, (friendships: Friendship[]) => {
      const list: FriendOption[] = [];

      friendships.forEach((f) => {
        const otherUid = f.participantUids.find((uid) => uid !== user.uid);
        if (otherUid && f.participantData && f.participantData[otherUid]) {
          const info = f.participantData[otherUid];
          list.push({
            uid: otherUid,
            displayName: info.displayName || 'Friend',
            username: info.username || 'user',
            avatarUrl: info.avatarUrl || null,
          });
        }
      });

      setFriends(list);
      if (list.length > 0 && !selectedFriendUid) {
        setSelectedFriendUid(list[0].uid);
      }
      setFetchingFriends(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const suggestedHabits = mode === 'solo' ? [
    'Daily Coding',
    'Morning Workout',
    'Read 20 Pages',
    'Drink 2L Water',
    'Daily Journaling',
    'Meditation',
  ] : [
    'Daily Coding & Review',
    'Morning Walk Together',
    'Reading Together',
    'Gym Accountability',
    'Language Practice',
    'No Sugar Challenge',
  ];

  const MAX_DESC_CHARS = 90;
  const MAX_DESC_WORDS = 18;
  const MAX_NAME_CHARS = 40;
  const MIN_NAME_CHARS = 2;

  const descWords = description.trim() ? description.trim().split(/\s+/).length : 0;
  const isDescExceeded = description.length > MAX_DESC_CHARS || descWords > MAX_DESC_WORDS;

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a streak name.');
      return;
    }

    if (trimmedName.length < MIN_NAME_CHARS) {
      setError(`Streak name must be at least ${MIN_NAME_CHARS} characters.`);
      return;
    }

    if (trimmedName.length > MAX_NAME_CHARS) {
      setError(`Streak name cannot exceed ${MAX_NAME_CHARS} characters.`);
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length > MAX_DESC_CHARS || descWords > MAX_DESC_WORDS) {
      setError(`Description is limited to 1–2 lines (maximum ${MAX_DESC_CHARS} characters or ${MAX_DESC_WORDS} words).`);
      return;
    }

    if (!user?.uid) {
      setError('You must be signed in to create a streak.');
      return;
    }

    if (mode === 'friend') {
      if (!selectedFriendUid) {
        setError('Please select an accountability partner, or switch to Solo Habit.');
        return;
      }
    }

    setError(null);
    setLoading(true);

    try {
      if (mode === 'solo') {
        await streakService.createStreak({
          name: trimmedName,
          description: trimmedDesc || undefined,
          isSolo: true,
          creatorUid: user.uid,
          creatorName: user.displayName || 'StreakMate User',
          creatorAvatarUrl: user.photoURL,
          reminderLeadHours: reminderLead,
        });
      } else {
        const chosenFriend = friends.find((f) => f.uid === selectedFriendUid);
        if (!chosenFriend) {
          setError('Selected partner not found.');
          setLoading(false);
          return;
        }

        await streakService.createStreak({
          name: trimmedName,
          description: trimmedDesc || undefined,
          isSolo: false,
          friendUid: chosenFriend.uid,
          friendName: chosenFriend.displayName,
          friendAvatarUrl: chosenFriend.avatarUrl,
          creatorUid: user.uid,
          creatorName: user.displayName || 'StreakMate User',
          creatorAvatarUrl: user.photoURL,
          reminderLeadHours: reminderLead,
        });
      }

      router.back();
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string })?.message || 'Failed to create streak.';
      setError(errorMsg);
      setLoading(false);
    }
  };

  const isDaytime = skyConfig.isDarkContent;

  return (
    <LivingSkyBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom + spacing.md,
              paddingHorizontal: spacing.xl,
            },
          ]}
        >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDaytime ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.65)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color={isDaytime ? '#0F172A' : '#FFFFFF'} />
          </TouchableOpacity>
          <Text style={[typography.title3, { color: isDaytime ? '#0F172A' : '#FFFFFF', fontWeight: '700' }]}>
            {mode === 'solo' ? 'Create Solo Streak' : 'Start Friend Streak'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {error && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: colors.dangerMuted,
                  borderColor: colors.danger,
                  borderRadius: 8,
                  padding: spacing.md,
                  marginBottom: spacing.base,
                },
              ]}
            >
              <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {/* Mode Selector (Solo vs Friend) */}
          <View
            style={[
              styles.modeSelector,
              {
                backgroundColor: isDaytime ? 'rgba(255, 255, 255, 0.92)' : 'rgba(15, 23, 42, 0.75)',
                borderColor: isDaytime ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.20)',
                borderWidth: 1.5,
                borderRadius: borderRadius.md,
                padding: 4,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setMode('solo')}
              style={[
                styles.modeTab,
                {
                  backgroundColor: mode === 'solo'
                    ? isDaytime ? '#FFFFFF' : 'rgba(255, 255, 255, 0.20)'
                    : 'transparent',
                  borderRadius: borderRadius.sm,
                  borderColor: mode === 'solo' ? skyConfig.accent : 'transparent',
                  borderWidth: mode === 'solo' ? 1.5 : 0,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: mode === 'solo' ? 2 : 0 },
                  shadowOpacity: mode === 'solo' ? 0.10 : 0,
                  shadowRadius: 4,
                  elevation: mode === 'solo' ? 2 : 0,
                },
              ]}
            >
              <Ionicons
                name="person"
                size={16}
                color={mode === 'solo' ? skyConfig.accent : isDaytime ? '#64748B' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: mode === 'solo'
                      ? isDaytime ? '#0F172A' : '#FFFFFF'
                      : isDaytime ? '#64748B' : '#94A3B8',
                    fontWeight: mode === 'solo' ? '700' : '600',
                  },
                ]}
              >
                Solo Habit (Just Me)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode('friend')}
              style={[
                styles.modeTab,
                {
                  backgroundColor: mode === 'friend'
                    ? isDaytime ? '#FFFFFF' : 'rgba(255, 255, 255, 0.20)'
                    : 'transparent',
                  borderRadius: borderRadius.sm,
                  borderColor: mode === 'friend' ? skyConfig.accent : 'transparent',
                  borderWidth: mode === 'friend' ? 1.5 : 0,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: mode === 'friend' ? 2 : 0 },
                  shadowOpacity: mode === 'friend' ? 0.10 : 0,
                  shadowRadius: 4,
                  elevation: mode === 'friend' ? 2 : 0,
                },
              ]}
            >
              <Ionicons
                name="people"
                size={16}
                color={mode === 'friend' ? skyConfig.accent : isDaytime ? '#64748B' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: mode === 'friend'
                      ? isDaytime ? '#0F172A' : '#FFFFFF'
                      : isDaytime ? '#64748B' : '#94A3B8',
                    fontWeight: mode === 'friend' ? '700' : '600',
                  },
                ]}
              >
                With a Friend
              </Text>
            </TouchableOpacity>
          </View>

          {/* Partner selection (only for friend mode) */}
          {mode === 'friend' ? (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.headline, { color: isDaytime ? '#0F172A' : '#FFFFFF', fontWeight: '700', marginBottom: spacing.xs }]}>
                Choose Accountability Partner
              </Text>

              {fetchingFriends ? (
                <View style={{ paddingVertical: 20 }}>
                  <ActivityIndicator size="small" color={skyConfig.accent} />
                </View>
              ) : friends.length === 0 ? (
                <Card
                  style={{
                    marginBottom: spacing.md,
                    alignItems: 'center',
                    padding: spacing.lg,
                    backgroundColor: isDaytime ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.75)',
                    borderColor: isDaytime ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.20)',
                    borderWidth: 1.5,
                  }}
                >
                  <Ionicons name="people-outline" size={32} color={isDaytime ? '#64748B' : '#94A3B8'} style={{ marginBottom: 8 }} />
                  <Text style={[typography.headline, { color: isDaytime ? '#0F172A' : '#FFFFFF', fontWeight: '700', textAlign: 'center' }]}>
                    No Friends Added Yet
                  </Text>
                  <Text style={[typography.caption, { color: isDaytime ? '#334155' : '#CBD5E1', textAlign: 'center', marginTop: 4, marginBottom: spacing.md }]}>
                    Shared streaks require a partner. You can add a friend first, or switch to "Solo Habit" above!
                  </Text>
                  <Button
                    title="Add a Friend"
                    variant="outline"
                    size="sm"
                    onPress={() => router.push('/friends/add')}
                  />
                </Card>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: spacing.md }}
                >
                  {friends.map((friend) => {
                    const isSelected = selectedFriendUid === friend.uid;
                    return (
                      <TouchableOpacity
                        key={friend.uid}
                        onPress={() => setSelectedFriendUid(friend.uid)}
                        style={[
                          styles.friendPill,
                          {
                            backgroundColor: isSelected
                              ? isDaytime ? '#FFFFFF' : 'rgba(255, 255, 255, 0.20)'
                              : isDaytime ? 'rgba(255, 255, 255, 0.88)' : 'rgba(15, 23, 42, 0.70)',
                            borderColor: isSelected ? skyConfig.accent : isDaytime ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.20)',
                            borderWidth: isSelected ? 2 : 1.5,
                            borderRadius: borderRadius.md,
                            padding: spacing.sm,
                            marginRight: spacing.sm,
                          },
                        ]}
                      >
                        <Avatar name={friend.displayName} size={36} />
                        <View style={{ marginLeft: spacing.sm }}>
                          <Text
                            style={[
                              typography.caption,
                              {
                                color: isDaytime ? '#0F172A' : '#FFFFFF',
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}
                          >
                            {friend.displayName}
                          </Text>
                          <Text style={[typography.caption, { color: isDaytime ? '#64748B' : '#94A3B8', fontSize: 11 }]}>
                            @{friend.username}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.soloNotice,
                {
                  backgroundColor: isDaytime ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.75)',
                  borderColor: isDaytime ? 'rgba(2, 132, 199, 0.35)' : 'rgba(56, 189, 248, 0.30)',
                  borderWidth: 1.5,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                },
              ]}
            >
              <Ionicons name="sparkles" size={20} color={skyConfig.accent} style={{ marginRight: spacing.sm }} />
              <Text style={[typography.caption, { color: isDaytime ? '#1E293B' : '#E2E8F0', flex: 1, fontWeight: '500' }]}>
                Personal Streak: Track your own daily consistency. Your streak advances as soon as you check in each day!
              </Text>
            </View>
          )}

          {/* Streak Custom Name */}
          <Input
            label="Streak Name"
            placeholder={mode === 'solo' ? 'e.g. Daily Coding, Gym Consistency' : 'e.g. Reading Together, Study Session'}
            value={name}
            onChangeText={setName}
            leftIcon="flame-outline"
          />

          {/* Suggested Quick Names */}
          <View style={styles.suggestionsRow}>
            {suggestedHabits.map((habit) => (
              <TouchableOpacity
                key={habit}
                onPress={() => setName(habit)}
                style={[
                  styles.suggestionChip,
                  {
                    backgroundColor: isDaytime ? '#FFFFFF' : 'rgba(15, 23, 42, 0.75)',
                    borderColor: isDaytime ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.22)',
                    borderWidth: 1.5,
                    borderRadius: borderRadius.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 7,
                    marginRight: 8,
                    marginBottom: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDaytime ? 0.06 : 0.2,
                    shadowRadius: 2,
                    elevation: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isDaytime ? '#0F172A' : '#FFFFFF',
                      fontWeight: '600',
                    },
                  ]}
                >
                  {habit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description (Strictly validated to 1-2 lines, max 90 chars) */}
          <View style={{ marginTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={[typography.headline, { color: isDaytime ? '#0F172A' : '#FFFFFF', fontWeight: '700' }]}>
                Description <Text style={[typography.caption, { color: isDaytime ? '#64748B' : '#94A3B8', fontWeight: '400' }]}> (Max 1–2 lines)</Text>
              </Text>
              <Text
                style={[
                  typography.caption,
                  {
                    color: isDescExceeded ? colors.danger : isDaytime ? '#64748B' : '#94A3B8',
                    fontWeight: isDescExceeded ? '700' : '500',
                    fontSize: 12,
                  },
                ]}
              >
                {description.length}/{MAX_DESC_CHARS} chars
              </Text>
            </View>

            <Input
              placeholder="What does victory look like today? Keep it concise!"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (error) setError(null);
              }}
              multiline
              numberOfLines={2}
              maxLength={120}
              error={
                isDescExceeded
                  ? `Description is limited to 1–2 lines (max ${MAX_DESC_CHARS} characters / ${MAX_DESC_WORDS} words).`
                  : undefined
              }
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons
                name={isDescExceeded ? 'alert-circle' : 'checkmark-circle-outline'}
                size={14}
                color={isDescExceeded ? colors.danger : colors.appleMint}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: isDescExceeded ? colors.danger : isDaytime ? '#334155' : '#CBD5E1',
                    fontSize: 11,
                    fontWeight: '500',
                  },
                ]}
              >
                {isDescExceeded
                  ? `Exceeds 2 lines limit by ${description.length - MAX_DESC_CHARS} characters`
                  : 'Keep it punchy: 1–2 short lines to stay focused without clutter.'}
              </Text>
            </View>
          </View>

          {/* Reminder Lead Selection */}
          <Text style={[typography.headline, { color: isDaytime ? '#0F172A' : '#FFFFFF', fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs }]}>
            Daily Reminder
          </Text>
          <Card
            style={{
              marginBottom: spacing.xl,
              padding: spacing.sm,
              backgroundColor: isDaytime ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.75)',
              borderColor: isDaytime ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.20)',
              borderWidth: 1.5,
            }}
          >
            <View style={styles.leadSelector}>
              {[1, 3, 6].map((hours) => {
                const isSelected = reminderLead === hours;
                return (
                  <TouchableOpacity
                    key={hours}
                    onPress={() => setReminderLead(hours)}
                    style={[
                      styles.leadOption,
                      {
                        backgroundColor: isSelected
                          ? skyConfig.accent
                          : isDaytime
                          ? '#F1F5F9'
                          : 'rgba(255, 255, 255, 0.08)',
                        borderColor: isSelected
                          ? skyConfig.accent
                          : isDaytime
                          ? '#E2E8F0'
                          : 'transparent',
                        borderWidth: 1.5,
                        borderRadius: borderRadius.sm,
                        paddingVertical: spacing.sm,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : isDaytime
                            ? '#0F172A'
                            : '#E2E8F0',
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {hours} {hours === 1 ? 'Hour' : 'Hours'} Before
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Create Action */}
          <Button
            title={mode === 'solo' ? 'Create Solo Streak' : 'Create Friend Streak'}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={(mode === 'friend' && friends.length === 0) || isDescExceeded || name.trim().length < MIN_NAME_CHARS}
            onPress={handleCreate}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 16,
  },
  scroll: {
    paddingBottom: 40,
  },
  errorBanner: {
    borderWidth: 1,
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  soloNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  friendPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -8,
    marginBottom: 16,
  },
  suggestionChip: {},
  leadSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leadOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
});
