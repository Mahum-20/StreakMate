import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSky } from '@/core/environment/SkyContext';
import { useTheme } from '@/core/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface StreakActionMenuModalProps {
  visible: boolean;
  streakName: string;
  currentStreak: number;
  status: 'active' | 'at_risk' | 'broken' | 'paused' | 'frozen';
  onClose: () => void;
  onTogglePause?: () => void;
  onDeletePress: () => void;
  onViewDetails?: () => void;
}

export const StreakActionMenuModal: React.FC<StreakActionMenuModalProps> = ({
  visible,
  streakName,
  currentStreak,
  status,
  onClose,
  onTogglePause,
  onDeletePress,
  onViewDetails,
}) => {
  const { skyConfig } = useSky();
  const { typography } = useTheme();

  if (!visible) return null;

  const isPaused = status === 'paused';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
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
              {/* Drag Indicator */}
              <View
                style={[
                  styles.handle,
                  {
                    backgroundColor: skyConfig.isDarkContent
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.2)',
                  },
                ]}
              />

              {/* Header: Title + Streak Name + Flame Badge */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      typography.headline,
                      styles.title,
                      { color: skyConfig.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {streakName}
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: skyConfig.textSecondary, marginTop: 2 },
                    ]}
                  >
                    Streak Options
                  </Text>
                </View>

                <View
                  style={[
                    styles.streakBadge,
                    {
                      backgroundColor: skyConfig.isDarkContent
                        ? 'rgba(255, 150, 0, 0.12)'
                        : 'rgba(255, 150, 0, 0.18)',
                      borderColor: 'rgba(255, 150, 0, 0.35)',
                    },
                  ]}
                >
                  <Ionicons name="flame" size={14} color="#FF9600" style={{ marginRight: 4 }} />
                  <Text style={styles.streakBadgeText}>
                    {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                {/* 1. View Details (if provided) */}
                {onViewDetails && (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: skyConfig.isDarkContent
                          ? 'rgba(0, 0, 0, 0.04)'
                          : 'rgba(255, 255, 255, 0.05)',
                        borderColor: skyConfig.isDarkContent
                          ? 'rgba(0, 0, 0, 0.08)'
                          : 'rgba(255, 255, 255, 0.08)',
                      },
                    ]}
                    onPress={() => {
                      onClose();
                      onViewDetails();
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: skyConfig.isDarkContent
                            ? 'rgba(85, 185, 173, 0.12)'
                            : 'rgba(119, 210, 197, 0.15)',
                        },
                      ]}
                    >
                      <Ionicons name="eye-outline" size={20} color={skyConfig.accent} />
                    </View>
                    <View style={styles.optionTextCol}>
                      <Text
                        style={[
                          typography.bodyMedium,
                          styles.optionTitle,
                          { color: skyConfig.textPrimary },
                        ]}
                      >
                        View Details
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          { color: skyConfig.textSecondary, marginTop: 1 },
                        ]}
                      >
                        Check streak history, freezes & stats
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={skyConfig.textSecondary}
                    />
                  </TouchableOpacity>
                )}

                {/* 2. Pause / Resume Streak */}
                {onTogglePause && (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: skyConfig.isDarkContent
                          ? 'rgba(0, 0, 0, 0.04)'
                          : 'rgba(255, 255, 255, 0.05)',
                        borderColor: skyConfig.isDarkContent
                          ? 'rgba(0, 0, 0, 0.08)'
                          : 'rgba(255, 255, 255, 0.08)',
                      },
                    ]}
                    onPress={() => {
                      onClose();
                      onTogglePause();
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: isPaused
                            ? 'rgba(85, 185, 173, 0.15)'
                            : 'rgba(235, 207, 153, 0.18)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={isPaused ? 'play-circle-outline' : 'pause-circle-outline'}
                        size={20}
                        color={isPaused ? skyConfig.accent : '#FFA21A'}
                      />
                    </View>
                    <View style={styles.optionTextCol}>
                      <Text
                        style={[
                          typography.bodyMedium,
                          styles.optionTitle,
                          { color: skyConfig.textPrimary },
                        ]}
                      >
                        {isPaused ? 'Resume Streak' : 'Pause Streak'}
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          { color: skyConfig.textSecondary, marginTop: 1 },
                        ]}
                      >
                        {isPaused
                          ? 'Reactivate daily tracking and reminders'
                          : 'Take a planned break without losing momentum'}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={skyConfig.textSecondary}
                    />
                  </TouchableOpacity>
                )}

                {/* 3. Delete Streak */}
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    styles.deleteOption,
                    {
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.25)',
                    },
                  ]}
                  onPress={() => {
                    onClose();
                    onDeletePress();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.optionTextCol}>
                    <Text style={[typography.bodyMedium, styles.optionTitle, { color: '#EF4444' }]}>
                      Delete Streak
                    </Text>
                    <Text style={[typography.caption, { color: '#F87171', marginTop: 1 }]}>
                      Permanently remove this habit and all history
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: skyConfig.isDarkContent
                      ? 'rgba(0, 0, 0, 0.05)'
                      : 'rgba(255, 255, 255, 0.08)',
                    borderColor: skyConfig.isDarkContent
                      ? 'rgba(0, 0, 0, 0.1)'
                      : 'rgba(255, 255, 255, 0.15)',
                  },
                ]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    typography.bodyMedium,
                    styles.cancelBtnText,
                    { color: skyConfig.textPrimary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: SCREEN_WIDTH,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginLeft: 8,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9600',
  },
  optionsList: {
    gap: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  deleteOption: {},
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
