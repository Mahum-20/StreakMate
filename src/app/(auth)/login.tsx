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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const { skyConfig } = useSky();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setGeneralError('Please enter both email and password.');
      return;
    }

    setGeneralError(null);
    setLoading(true);

    try {
      await authService.login(email, password);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      setGeneralError(getAuthErrorMessage(error.code || '', error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
              paddingTop: insets.top + spacing.xl,
              paddingBottom: insets.bottom + spacing.xl,
              paddingHorizontal: spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Branding Hero */}
          <View style={styles.heroSection}>
            <View style={[styles.logoBadge, { backgroundColor: skyConfig.badgeBg }]}>
              <Ionicons
                name={skyConfig.celestialBody === 'moon' ? 'moon' : 'sparkles'}
                size={32}
                color={skyConfig.accent}
              />
            </View>
            <Text style={[typography.microLabel, { color: skyConfig.accent, marginTop: spacing.sm }]}>
              {skyConfig.label.toUpperCase()}
            </Text>
            <Text style={[typography.editorialTitle, { color: skyConfig.textPrimary, marginTop: 4, textAlign: 'center' }]}>
              {skyConfig.greeting}
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: skyConfig.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              Sign in to continue your living rhythm
            </Text>
          </View>

          {/* Floating Glass Auth Card */}
          <Card style={{ marginTop: spacing.sm, padding: spacing.xl }}>
            {/* Error message banner */}
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

            {/* Inputs */}
            <View style={styles.formSection}>
              <Input
                label="Email Address"
                placeholder="name@example.com"
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

              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                style={styles.forgotBtn}
              >
                <Text style={[typography.caption, { color: skyConfig.accent, fontWeight: '600' }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>

              <Button
                title="Log In"
                onPress={handleLogin}
                loading={loading}
                variant="primary"
                size="lg"
                style={{ marginTop: spacing.sm }}
              />

              {/* Social Divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: skyConfig.glassBorderBottom }]} />
                <Text style={[typography.caption, { color: skyConfig.textMuted, marginHorizontal: spacing.md }]}>
                  OR
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: skyConfig.glassBorderBottom }]} />
              </View>

              {/* Google Sign In */}
              <Button
                title="Continue with Google"
                onPress={handleGoogleSignIn}
                loading={googleLoading}
                variant="outline"
                size="lg"
                icon={<Ionicons name="logo-google" size={18} color={skyConfig.textPrimary} />}
              />
            </View>
          </Card>

          {/* Sign up footer */}
          <View style={styles.footerSection}>
            <Text style={[typography.bodyMedium, { color: skyConfig.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[typography.bodyMedium, { color: skyConfig.accent, fontWeight: '700' }]}>
                Sign Up
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
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  formSection: {
    width: '100%',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  footerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
});
