import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { Button, Input, Card } from '@/components/common';
import { LivingSkyBackground } from '@/components/motion/LivingSkyBackground';
import { authService, getAuthErrorMessage } from '@/features/auth/services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const { skyConfig } = useSky();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password) {
      setGeneralError('Please fill out all fields.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setGeneralError('Please enter a valid email address.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setGeneralError('Username must be 3-20 letters, numbers, or underscores.');
      return;
    }

    if (password.length < 8) {
      setGeneralError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setGeneralError('Passwords do not match.');
      return;
    }

    setGeneralError(null);
    setLoading(true);

    try {
      await authService.register({
        email,
        password,
        displayName,
        username: cleanUsername,
      });
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      setGeneralError(getAuthErrorMessage(error.code || '', error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGeneralError(null);
    setGoogleLoading(true);

    try {
      await authService.loginWithGoogle();
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      setGeneralError(getAuthErrorMessage(error.code || '', error.message));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <LivingSkyBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingTop: insets.top + spacing.lg,
              paddingBottom: insets.bottom + spacing.xl,
              paddingHorizontal: spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back navigation */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { marginBottom: spacing.md }]}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
          >
            <Ionicons name="arrow-back" size={24} color={skyConfig.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={[typography.editorialTitle, { color: skyConfig.textPrimary }]}>
              Create Account
            </Text>
            <Text style={[typography.bodyMedium, { color: skyConfig.textSecondary, marginTop: spacing.xs }]}>
              Build lifelong habits and accountability with friends
            </Text>
          </View>

          {/* Floating Glass Register Card */}
          <Card style={{ padding: spacing.xl, marginBottom: spacing.lg }}>
            {generalError && (
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
                <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 8 }} />
                <Text style={[typography.caption, { color: colors.danger, flex: 1 }]}>
                  {generalError}
                </Text>
              </View>
            )}

            <View style={styles.formSection}>
              {/* Google Sign Up button */}
              <Button
                title="Sign Up with Google"
                onPress={handleGoogleSignUp}
                loading={googleLoading}
                variant="outline"
                size="lg"
                icon={<Ionicons name="logo-google" size={18} color={skyConfig.textPrimary} style={{ marginRight: 8 }} />}
                style={{ marginBottom: spacing.md }}
              />

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: skyConfig.glassBorderBottom }]} />
                <Text style={[typography.caption, { color: skyConfig.textMuted, marginHorizontal: spacing.md }]}>
                  OR SIGN UP WITH EMAIL
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: skyConfig.glassBorderBottom }]} />
              </View>

              <Input
                label="Full Name"
                placeholder="Sarah Jenkins"
                value={displayName}
                onChangeText={setDisplayName}
                leftIcon="person-outline"
              />

              <Input
                label="Username"
                placeholder="sarah_j"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                helperText="Friends can find you using your unique username."
                leftIcon="at-outline"
              />

              <Input
                label="Email Address"
                placeholder="sarah@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="mail-outline"
              />

              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />

              <Input
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />

              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={loading}
                variant="primary"
                size="lg"
                style={{ marginTop: spacing.sm }}
              />
            </View>
          </Card>

          <View style={styles.footerSection}>
            <Text style={[typography.bodyMedium, { color: skyConfig.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[typography.bodyMedium, { color: skyConfig.accent, fontWeight: '700' }]}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LivingSkyBackground>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  headerSection: {
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  formSection: {
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  footerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
});
