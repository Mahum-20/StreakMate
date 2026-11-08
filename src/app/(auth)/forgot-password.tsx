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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const { skyConfig } = useSky();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email.trim()) {
      setGeneralError('Please enter your email address.');
      return;
    }

    setGeneralError(null);
    setLoading(true);

    try {
      await authService.resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      setGeneralError(getAuthErrorMessage(error.code || ''));
    } finally {
      setLoading(false);
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { marginBottom: spacing.md }]}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
          >
            <Ionicons name="arrow-back" size={24} color={skyConfig.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={[typography.microLabel, { color: skyConfig.accent, marginBottom: 4 }]}>
              {skyConfig.label.toUpperCase()}
            </Text>
            <Text style={[typography.editorialTitle, { color: skyConfig.textPrimary }]}>Reset Password</Text>
            <Text style={[typography.bodyMedium, { color: skyConfig.textSecondary, marginTop: spacing.xs }]}>
              Enter the email associated with your account and we will send you a secure recovery link.
            </Text>
          </View>

          {/* Floating Glass Reset Card */}
          <Card style={{ padding: spacing.xl }}>
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

            {success ? (
              <View
                style={[
                  styles.successCard,
                  {
                    backgroundColor: skyConfig.badgeBg,
                    borderColor: colors.success,
                    padding: spacing.lg,
                    borderRadius: 12,
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={32} color={colors.success} style={{ marginBottom: 8 }} />
                <Text style={[typography.headline, { color: colors.success }]}>
                  Recovery Email Sent
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: skyConfig.textSecondary, marginTop: 4, textAlign: 'center' },
                  ]}
                >
                  Please check your inbox at <Text style={{ fontWeight: '700' }}>{email}</Text> to reset your password.
                </Text>
                <Button
                  title="Return to Login"
                  onPress={() => router.back()}
                  variant="outline"
                  size="md"
                  style={{ marginTop: spacing.lg, width: '100%' }}
                />
              </View>
            ) : (
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

                <Button
                  title="Send Recovery Link"
                  onPress={handleReset}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            )}
          </Card>
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
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  successCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  formSection: {
    width: '100%',
  },
});
