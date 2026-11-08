import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/core/theme';
import { useAuthStore } from '@/store/useAuthStore';

export default function IndexScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.branding}>
        <View style={[styles.iconBox, { backgroundColor: colors.accentMuted }]}>
          <Ionicons name="flame" size={48} color={colors.accent} />
        </View>
        <Text style={[typography.title1, { color: colors.textPrimary, marginTop: 16 }]}>
          StreakMate
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
          Keep every promise. Together.
        </Text>
      </View>
      <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  branding: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: 40,
  },
});
