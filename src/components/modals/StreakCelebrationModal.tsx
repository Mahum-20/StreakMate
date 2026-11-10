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
import { ConfettiCelebration } from '../motion/ConfettiCelebration';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StreakCelebrationModalProps {
  visible: boolean;
  streakName: string;
  streakCount: number;
  message?: string;
  onClose: () => void;
}

export const StreakCelebrationModal: React.FC<StreakCelebrationModalProps> = ({
  visible,
  streakName,
  streakCount,
  message,
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
        {/* Confetti graphics */}
        <ConfettiCelebration visible={visible} onFinish={() => {}} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: skyConfig.isDarkContent
                ? 'rgba(255, 255, 255, 0.94)'
                : 'rgba(15, 23, 42, 0.94)',
              borderColor: skyConfig.isDarkContent
                ? 'rgba(255, 255, 255, 0.8)'
                : 'rgba(255, 255, 255, 0.15)',
            },
          ]}
        >
          {/* Flame Icon Container with Cute Pulsing Glow */}
          <View style={styles.flameContainer}>
            <View style={styles.glowRing} />
            <View style={styles.flameCircle}>
              <Ionicons name="flame" size={54} color="#FF9600" />
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
            Streak Extended!
          </Text>

          {/* Streak Counter Pill */}
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={18} color="#FF9600" style={{ marginRight: 6 }} />
            <Text style={styles.streakCountText}>
              {streakCount} {streakCount === 1 ? 'DAY' : 'DAYS'} IN A ROW
            </Text>
          </View>

          {/* Streak Name */}
          <Text
            style={[
              typography.headline,
              styles.streakName,
              { color: skyConfig.textPrimary },
            ]}
            numberOfLines={1}
          >
            {streakName}
          </Text>

          {/* Motivational description */}
          <Text
            style={[
              typography.bodySmall,
              styles.description,
              { color: skyConfig.textSecondary },
            ]}
          >
            {message || "Consistency secured for today! You're keeping your momentum alive."}
          </Text>

          {/* Chunky 3D Duolingo-style action button */}
          <TouchableOpacity
            style={styles.actionButton}
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
    padding: 24,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 340),
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  flameContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 150, 0, 0.20)',
  },
  flameCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFE0B2',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginBottom: 12,
  },
  streakCountText: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  streakName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionButton: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    backgroundColor: '#58CC02',
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#58CC02',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.8,
  },
});
