import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSky } from '@/core/environment/SkyContext';
import { useTheme } from '@/core/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface StreakDeletedModalProps {
  visible: boolean;
  streakName: string;
  onClose: () => void;
}

export const StreakDeletedModal: React.FC<StreakDeletedModalProps> = ({
  visible,
  streakName,
  onClose,
}) => {
  const { skyConfig } = useSky();
  const { typography } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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
          {/* Subtle Glow Ring & Clean Deletion Icon */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.glowRing,
                {
                  backgroundColor: skyConfig.isDarkContent
                    ? 'rgba(85, 185, 173, 0.15)'
                    : 'rgba(119, 210, 197, 0.15)',
                },
              ]}
            />
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: skyConfig.isDarkContent
                    ? 'rgba(85, 185, 173, 0.12)'
                    : 'rgba(119, 210, 197, 0.15)',
                  borderColor: skyConfig.accent,
                },
              ]}
            >
              <Ionicons name="checkmark-done" size={42} color={skyConfig.accent} />
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
            Streak Removed
          </Text>

          {/* Subtitle / Streak Name */}
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
          </View>

          {/* Description */}
          <Text
            style={[
              typography.bodySmall,
              styles.description,
              { color: skyConfig.textSecondary },
            ]}
          >
            Your habit list and home screen widget have been updated cleanly.
          </Text>

          {/* Chunky 3D Duolingo-style Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: skyConfig.accent,
                borderBottomColor: skyConfig.isDarkContent ? '#3D8E83' : '#4EA599',
              },
            ]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>CONTINUE</Text>
          </TouchableOpacity>
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
    width: Math.min(SCREEN_WIDTH - 48, 350),
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
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
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  streakPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  streakNameText: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 220,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  actionButton: {
    borderBottomWidth: 4,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.8,
  },
});
