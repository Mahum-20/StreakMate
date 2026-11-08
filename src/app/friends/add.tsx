import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { useAuthStore } from '@/store/useAuthStore';
import { Button, Input, Card, Avatar } from '@/components/common';
import { LivingSkyBackground } from '@/components/motion/LivingSkyBackground';
import { friendService, UserSearchResult } from '@/features/friends/services/friendService';

export default function AddFriendModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const { skyConfig } = useSky();
  const { user } = useAuthStore();

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [foundUser, setFoundUser] = useState<UserSearchResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const handleSearch = async () => {
    const trimmed = query.trim().replace('@', '').toLowerCase();
    if (!trimmed) {
      setErrorMessage('Please enter a username to search.');
      return;
    }

    if (trimmed.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setErrorMessage('Usernames can only contain letters, numbers, and underscores.');
      return;
    }

    setSearching(true);
    setFoundUser(null);
    setNotFound(false);
    setRequestSent(false);
    setErrorMessage(null);

    try {
      const result = await friendService.searchUserByUsername(trimmed);

      if (!result) {
        setNotFound(true);
      } else if (user && result.uid === user.uid) {
        setErrorMessage('You cannot add yourself as a friend.');
      } else {
        setFoundUser(result);
      }
    } catch (err: any) {
      console.warn('Search error:', err);
      const msg = err?.message || '';
      if (msg.includes('permission') || msg.includes('insufficient')) {
        setErrorMessage('Firestore permissions denied. Please update and publish your security rules in Firebase Console > Firestore Database > Rules tab.');
      } else {
        setErrorMessage(msg || 'Error searching for user.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user || !foundUser) return;
    setSending(true);
    setErrorMessage(null);

    try {
      await friendService.sendFriendRequest({
        fromUid: user.uid,
        fromDisplayName: user.displayName || 'StreakMate User',
        fromUsername: user.username || 'user',
        toUid: foundUser.uid,
      });
      setRequestSent(true);
    } catch (err: any) {
      console.warn('Send friend request error:', err);
      setErrorMessage(err?.message || 'Failed to send friend request.');
    } finally {
      setSending(false);
    }
  };

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
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={skyConfig.textPrimary} />
            </TouchableOpacity>
            <Text style={[typography.title3, { color: skyConfig.textPrimary, fontWeight: '700' }]}>
              Find Friends
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={[typography.bodyMedium, { color: skyConfig.textSecondary, marginBottom: spacing.md }]}>
          Enter an exact username to send a streak accountability invitation.
        </Text>

        {/* Search Input */}
        <Input
          placeholder="e.g. daniel_k"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (notFound) setNotFound(false);
            if (errorMessage) setErrorMessage(null);
          }}
          onSubmitEditing={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          leftIcon="search-outline"
        />

        <Button
          title="Search"
          variant="primary"
          size="md"
          loading={searching}
          onPress={handleSearch}
          style={{ marginBottom: spacing.lg }}
        />

        {/* Error message */}
        {errorMessage && (
          <View
            style={[
              styles.messageBanner,
              { backgroundColor: colors.dangerMuted, borderColor: colors.danger },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[typography.caption, { color: colors.danger, flex: 1 }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Not found notice */}
        {notFound && (
          <View
            style={[
              styles.messageBanner,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              No user found with username "@{query.trim().replace('@', '').toLowerCase()}". Check the spelling and try again.
            </Text>
          </View>
        )}

        {/* Found Result Card */}
        {foundUser && (
          <Card style={styles.resultCard}>
            <View style={styles.resultContent}>
              <Avatar name={foundUser.displayName} imageUrl={foundUser.avatarUrl} size={48} />
              <View style={[styles.resultInfo, { marginLeft: spacing.md }]}>
                <Text style={[typography.headline, { color: skyConfig.textPrimary }]}>
                  {foundUser.displayName}
                </Text>
                <Text style={[typography.caption, { color: skyConfig.textSecondary }]}>
                  @{foundUser.username}
                </Text>
              </View>
            </View>

            {requestSent ? (
              <View
                style={[
                  styles.sentBadge,
                  {
                    backgroundColor: colors.successMuted,
                    marginTop: spacing.md,
                    padding: spacing.sm,
                    borderRadius: 8,
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={[typography.caption, { color: colors.success, fontWeight: '700' }]}>
                  Friend Request Sent!
                </Text>
              </View>
            ) : (
              <Button
                title="Send Friend Request"
                variant="primary"
                size="sm"
                loading={sending}
                onPress={handleSendRequest}
                style={{ marginTop: spacing.md }}
              />
            )}
          </Card>
        )}
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
    marginBottom: 20,
  },
  resultCard: {
    padding: 16,
    marginTop: 8,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
});
