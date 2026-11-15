import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSky } from '@/core/environment/SkyContext';
import { useTheme } from '@/core/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface DeleteStreakConfirmModalProps {
  visible: boolean;
  streakName: string;
  currentStreak?: number;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteStreakConfirmModal: React.FC<DeleteStreakConfirmModalProps> = ({
  visible,
  streakName,
  currentStreak,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { skyConfig } = useSky();
  const { typography } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: skyConfig.isDarkContent
                ? 'rgba(255, 255, 255, 0.96)'
                : 'rgba(17, 27, 36, 0.96)',
              borderColor: skyConfig.isDarkContent
                ? 'rgba(255, 255, 255, 0.8)'
                : 'rgba(255, 255, 255, 0.12)',
            },
          ]}
        >
          {/* Danger Trash Icon with Glowing Soft Red Ring */}
          <View style={styles.iconContainer}>
            <View style={styles.glowRing} />
            <View style={styles.iconCircle}>
              <Ionicons name="trash-outline" size={44} color="#EF4444" />
            </View>
          </View>

          {/* Title */}
          <Text
            style={[
              typography.editorialTitle,
              styles.title,
              { color: skyConfig.textPrimary },
            ]}
          >
            Delete Streak?
          </Text>

          {/* Streak Name Pill */}
          <View
            style={[
              styles.streakPill,
              {
                backgroundColor: skyConfig.isDarkContent
                  ? 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(255, 255, 255, 0.08)',
                borderColor: skyConfig.isDarkContent
                  ? 'rgba(0, 0, 0, 0.1)'
                  : 'rgba(255, 255, 255, 0.15)',
              },
            ]}
          >
            <Text
              style={[
                typography.headline,
                styles.streakNameText,
                { color: skyConfig.textPrimary },
              ]}
              numberOfLines={1}
            >
              {streakName}
            </Text>
            {currentStreak !== undefined && currentStreak > 0 && (
              <View style={styles.countBadge}>
                <Ionicons name="flame" size={13} color="#FF9600" style={{ marginRight: 3 }} />
                <Text style={styles.countText}>{currentStreak} days</Text>
              </View>
            )}
          </View>

          {/* Warning Message */}
          <Text
            style={[
              typography.bodySmall,
              styles.warningText,
              { color: skyConfig.textSecondary },
            ]}
          >
            Are you sure you want to permanently delete this streak? All momentum, check-in history, and freeze data will be lost.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            {/* Chunky 3D Duolingo-style Delete Button */}
            <TouchableOpacity
              style={[styles.deleteButton, loading && { opacity: 0.8 }]}
              onPress={onConfirm}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteButtonText}>DELETE PERMANENTLY</Text>
              )}
            </TouchableOpacity>

            {/* Cancel / Keep Streak Button */}
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: skyConfig.isDarkContent
                    ? 'rgba(0, 0, 0, 0.05)'
                    : 'rgba(255, 255, 255, 0.08)',
                  borderColor: skyConfig.isDarkContent
                    ? 'rgba(0, 0, 0, 0.1)'
                    : 'rgba(255, 255, 255, 0.15)',
                },
              ]}
              onPress={onCancel}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text
                style={[
                  typography.bodyMedium,
                  styles.cancelButtonText,
                  { color: skyConfig.textPrimary },
                ]}
              >
                Keep Streak
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 360),
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  iconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    maxWidth: '100%',
  },
  streakNameText: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 180,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(150, 150, 150, 0.25)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9600',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderBottomWidth: 4,
    borderBottomColor: '#B91C1C',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  cancelButton: {
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
