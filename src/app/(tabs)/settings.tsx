import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { SkyModePreference } from '@/core/environment/TimeOfDayEngine';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar, Card, Button, Input } from '@/components/common';
import { LivingSkyBackground } from '@/components/motion/LivingSkyBackground';
import { authService } from '@/features/auth/services/authService';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/adventurer/png?seed=Felix&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Aneka&backgroundColor=ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Milo&backgroundColor=c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/fun-emoji/png?seed=Tiger',
  'https://api.dicebear.com/7.x/fun-emoji/png?seed=Panda',
  'https://api.dicebear.com/7.x/bottts/png?seed=Sparky&backgroundColor=b6e3f4',
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { typography, spacing, borderRadius } = useTheme();
  const { skyConfig, skyModePreference, setSkyModePreference } = useSky();
  const { user, setUser } = useAuthStore();

  // Edit Profile Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '');
  const [editPhotoURL, setEditPhotoURL] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEditModal = () => {
    setEditDisplayName(user?.displayName || '');
    setEditPhotoURL(user?.photoURL || '');
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      Alert.alert('Validation Error', 'Display name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      await authService.updateUserProfile({
        displayName: editDisplayName.trim(),
        photoURL: editPhotoURL.trim() || undefined,
      });

      if (user) {
        setUser({
          ...user,
          displayName: editDisplayName.trim(),
          photoURL: editPhotoURL.trim() || user.photoURL,
        });
      }

      setIsEditModalVisible(false);
      Alert.alert('Profile Updated', 'Your profile information has been saved successfully.');
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Unable to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of StreakMate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              router.replace('/(auth)/login');
            } catch (err) {
              console.warn('Logout error', err);
            }
          },
        },
      ]
    );
  };

  const skyOptions: { key: SkyModePreference; label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'auto', label: 'Automatic', subtitle: 'Dynamic atmosphere based on your local sky', icon: 'time-outline' },
    { key: 'morning', label: 'Morning', subtitle: 'Soft blue dawn sky & gentle sunrise', icon: 'sunny-outline' },
    { key: 'afternoon', label: 'Afternoon', subtitle: 'Luminous azure sky & sunlit clouds', icon: 'partly-sunny-outline' },
    { key: 'golden_hour', label: 'Golden Hour', subtitle: 'Warm amber, peach & pink sunset', icon: 'flame-outline' },
    { key: 'twilight', label: 'Twilight', subtitle: 'Dusk lavender atmosphere & early stars', icon: 'planet-outline' },
    { key: 'night', label: 'Night', subtitle: 'Midnight navy sky, starlight & moon', icon: 'moon-outline' },
  ];

  const textPrimary = skyConfig.textPrimary;
  const textSecondary = skyConfig.textSecondary;
  const accentColor = skyConfig.accent;

  return (
    <LivingSkyBackground>
      {/* Top Floating Glass Header with generous spacing */}
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
        <Text style={[typography.editorialTitle, { color: textPrimary }]}>Settings</Text>
        <Text style={[typography.caption, { color: textSecondary, marginTop: 2 }]}>
          Living Atmosphere & Account Preferences
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card with Edit Button */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar
              name={user?.displayName || 'User'}
              imageUrl={user?.photoURL}
              size={56}
            />
            <View style={[styles.profileDetails, { marginLeft: spacing.md }]}>
              <Text style={[typography.title3, { color: textPrimary, fontWeight: '700' }]}>
                {user?.displayName || 'StreakMate User'}
              </Text>
              <Text style={[typography.caption, { color: textSecondary }]}>
                {user?.username ? `@${user.username}` : user?.email || 'No email'}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: skyConfig.textMuted, marginTop: 2, fontSize: 11 },
                ]}
              >
                Local Timezone: {user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleOpenEditModal}
              style={[
                styles.editBtn,
                {
                  backgroundColor: skyConfig.badgeBg,
                  borderColor: skyConfig.accent,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit Profile"
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={14} color={accentColor} />
              <Text style={[typography.caption, { color: accentColor, fontWeight: '700', marginLeft: 4 }]}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Living Sky Appearance & Time Controller */}
        <Text style={[typography.headline, { color: textPrimary, marginBottom: spacing.sm }]}>
          Living Sky Appearance
        </Text>
        <Text style={[typography.caption, { color: textSecondary, marginBottom: spacing.md }]}>
          The application naturally shifts its atmospheric sky environment according to your local device time. You can also manually choose an ambiance below.
        </Text>

        <Card style={{ marginBottom: spacing.xl, padding: spacing.sm }}>
          {skyOptions.map((opt, index) => {
            const isSelected = skyModePreference === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSkyModePreference(opt.key)}
                style={[
                  styles.skyOptionRow,
                  {
                    backgroundColor: isSelected ? skyConfig.badgeBg : 'transparent',
                    borderColor: isSelected ? accentColor : 'transparent',
                    borderWidth: 1,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginTop: index > 0 ? 4 : 0,
                  },
                ]}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.skyOptionIcon,
                    {
                      backgroundColor: isSelected ? accentColor : skyConfig.badgeBg,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isSelected ? '#FFFFFF' : textSecondary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: isSelected ? accentColor : textPrimary,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {opt.label} {opt.key === 'auto' && '(Default)'}
                  </Text>
                  <Text style={[typography.caption, { color: textSecondary, fontSize: 11, marginTop: 2 }]}>
                    {opt.subtitle}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={accentColor} />
                )}
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* Notifications & Reminders Info */}
        <Text style={[typography.headline, { color: textPrimary, marginBottom: spacing.sm }]}>
          Smart Reminders
        </Text>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.settingItem}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMedium, { color: textPrimary, fontWeight: '600' }]}>
                Lead Reminder
              </Text>
              <Text style={[typography.caption, { color: textSecondary, marginTop: 2 }]}>
                Alert 3 hours before streak expiration
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={accentColor} />
          </View>

          <View
            style={[
              styles.settingItem,
              {
                borderTopColor: skyConfig.glassBorderBottom,
                borderTopWidth: 1,
                paddingTop: spacing.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMedium, { color: textPrimary, fontWeight: '600' }]}>
                Final Urgent Warning
              </Text>
              <Text style={[typography.caption, { color: textSecondary, marginTop: 2 }]}>
                High-priority alert 30 minutes before breaking
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={accentColor} />
          </View>
        </Card>

        {/* Interactive Home Screen Widget Section */}
        <Text style={[typography.headline, { color: textPrimary, marginBottom: spacing.sm }]}>
          Interactive Widget
        </Text>
        <Card style={{ marginBottom: spacing.lg }}>
          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => router.push('/widget/index' as any)}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: skyConfig.badgeBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}
            >
              <Ionicons name="apps" size={20} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMedium, { color: textPrimary, fontWeight: '700' }]}>
                Home Screen Widget
              </Text>
              <Text style={[typography.caption, { color: textSecondary, marginTop: 2 }]}>
                1-tap check-in directly from your home screen
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* App Info & About */}
        <Text style={[typography.headline, { color: textPrimary, marginBottom: spacing.sm }]}>
          About
        </Text>
        <Card style={{ marginBottom: spacing.xl }}>
          <View style={styles.aboutRow}>
            <Text style={[typography.bodyMedium, { color: textSecondary }]}>Version</Text>
            <Text style={[typography.bodyMedium, { color: textPrimary, fontWeight: '600' }]}>
              1.0.0
            </Text>
          </View>
        </Card>

        {/* Sign Out Button - Theme-adaptive high-visibility button */}
        {(() => {
          const isDarkTheme = skyConfig.phase === 'twilight' || skyConfig.phase === 'night';
          const buttonBg = isDarkTheme ? 'rgba(255, 255, 255, 0.20)' : '#FFFFFF';
          const buttonBorder = isDarkTheme ? 'rgba(255, 255, 255, 0.40)' : '#FECACA';
          const buttonTextColor = isDarkTheme ? '#FFFFFF' : '#DC2626';

          return (
            <TouchableOpacity
              onPress={handleLogout}
              style={[
                styles.signOutBtn,
                {
                  backgroundColor: buttonBg,
                  borderColor: buttonBorder,
                  borderWidth: 1.5,
                  shadowColor: isDarkTheme ? '#000000' : 'rgba(220, 38, 38, 0.15)',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDarkTheme ? 0.25 : 0.15,
                  shadowRadius: 8,
                  elevation: 3,
                },
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Sign out of StreakMate"
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={buttonTextColor}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: buttonTextColor,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  },
                ]}
              >
                Sign Out of StreakMate
              </Text>
            </TouchableOpacity>
          );
        })()}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalBackdrop}>
            <Card
              style={[
                styles.modalCard,
                {
                  backgroundColor: skyConfig.glassSurface,
                  borderColor: skyConfig.glassBorderTop,
                  borderWidth: 1,
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[typography.title2, { color: textPrimary, fontWeight: '700' }]}>
                  Edit Profile
                </Text>
                <TouchableOpacity
                  onPress={() => setIsEditModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Avatar Live Preview */}
              <View style={styles.avatarPreviewContainer}>
                <Avatar
                  name={editDisplayName || 'User'}
                  imageUrl={editPhotoURL || undefined}
                  size={76}
                />
                <Text style={[typography.caption, { color: textSecondary, marginTop: 8 }]}>
                  Select your cartoon avatar:
                </Text>
              </View>

              {/* Cartoon Avatar Presets */}
              <View style={styles.presetsRow}>
                {AVATAR_PRESETS.map((presetUrl, idx) => {
                  const isSelected = editPhotoURL === presetUrl;
                  return (
                    <TouchableOpacity
                      key={`preset-${idx}`}
                      onPress={() => setEditPhotoURL(presetUrl)}
                      style={[
                        styles.presetItem,
                        {
                          borderColor: isSelected ? accentColor : 'transparent',
                          borderWidth: 2,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Avatar imageUrl={presetUrl} name={`Cartoon ${idx}`} size={44} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Display Name Input */}
              <Input
                label="Display Name"
                placeholder="Enter your name"
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                leftIcon="person-outline"
                containerStyle={{ marginBottom: spacing.lg }}
              />

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="md"
                  onPress={() => setIsEditModalVisible(false)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title={isSaving ? 'Saving...' : 'Save Changes'}
                  variant="primary"
                  size="md"
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  style={{ flex: 1, marginLeft: spacing.sm }}
                />
              </View>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LivingSkyBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    width: '100%',
    marginTop: 16,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  skyOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skyOptionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 20, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarPreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  presetItem: {
    borderRadius: 24,
    padding: 2,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 32,
  },
});
