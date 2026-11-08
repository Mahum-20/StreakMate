import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';
import { WidgetStreakSnapshot, widgetService } from '../widgetService';

interface InteractiveWidgetCardProps {
  snapshot: WidgetStreakSnapshot | null;
  currentUserId: string;
  onCheckInCompleted?: () => void;
  onOpenDetails?: (streakId: string) => void;
}

export const InteractiveWidgetCard: React.FC<InteractiveWidgetCardProps> = ({
  snapshot,
  currentUserId,
  onCheckInCompleted,
  onOpenDetails,
}) => {
  const { colors, typography, borderRadius, spacing } = useTheme();
  const { skyConfig } = useSky();
  const [checkingIn, setCheckingIn] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  if (!snapshot) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: skyConfig.glassSurface,
            borderColor: skyConfig.glassBorderTop,
          },
        ]}
      >
        <View style={styles.emptyContent}>
          <Ionicons name="apps-outline" size={32} color={skyConfig.textMuted} />
          <Text style={[typography.headline, { color: skyConfig.textPrimary, marginTop: 8 }]}>
            No Active Streak Pinned
          </Text>
          <Text style={[typography.caption, { color: skyConfig.textSecondary, textAlign: 'center', marginTop: 4 }]}>
            Pin a streak below to enable 1-tap check-ins directly from your home screen widget.
          </Text>
        </View>
      </View>
    );
  }

  const isCheckedIn = snapshot.userCheckedIn || justCheckedIn;

  const handleWidgetTap = async () => {
    if (isCheckedIn || checkingIn) return;

    setCheckingIn(true);
    const result = await widgetService.quickCheckIn(snapshot.id, currentUserId);
    setCheckingIn(false);

    if (result.success) {
      setJustCheckedIn(true);
      Alert.alert('Widget Check-In Completed', `Your check-in for "${snapshot.name}" was registered.`);
      onCheckInCompleted?.();
    } else {
      Alert.alert('Widget Check-In Failed', result.message);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: skyConfig.glassSurface,
          borderColor: isCheckedIn ? colors.success : skyConfig.glassBorderTop,
          borderWidth: 1.5,
        },
      ]}
    >
      {/* Widget Header bar */}
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={[styles.widgetIconBadge, { backgroundColor: skyConfig.badgeBg }]}>
            <Ionicons name="flame" size={14} color={skyConfig.accent} />
          </View>
          <Text style={[typography.microLabel, { color: skyConfig.textSecondary, letterSpacing: 1.4 }]}>
            HOME WIDGET
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isCheckedIn
                ? colors.successMuted
                : snapshot.hoursRemaining <= 3
                ? colors.warningMuted
                : skyConfig.badgeBg,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: isCheckedIn
                  ? colors.success
                  : snapshot.hoursRemaining <= 3
                  ? colors.warning
                  : skyConfig.accent,
                fontWeight: '700',
                fontSize: 11,
              },
            ]}
          >
            {isCheckedIn ? 'Checked In' : `${snapshot.hoursRemaining}h left`}
          </Text>
        </View>
      </View>

      {/* Main Content Info */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onOpenDetails?.(snapshot.id)}
        style={styles.contentRow}
      >
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text
            style={[typography.title2, { color: skyConfig.textPrimary, fontWeight: '700' }]}
            numberOfLines={1}
          >
            {snapshot.name}
          </Text>
          <Text style={[typography.caption, { color: skyConfig.textSecondary, marginTop: 2 }]}>
            {snapshot.isSolo ? 'Solo Rhythm' : `With ${snapshot.friendName}`}
          </Text>
        </View>

        {/* Streak Flame Counter */}
        <View style={styles.flameCounter}>
          <Text style={[typography.statNumber, { color: skyConfig.accent, fontSize: 32, lineHeight: 36 }]}>
            {snapshot.currentStreak}
          </Text>
          <Text style={[typography.microLabel, { color: skyConfig.textMuted, fontSize: 10 }]}>
            DAYS
          </Text>
        </View>
      </TouchableOpacity>

      {/* Interactive One-Tap Check-In Button right on the widget */}
      <TouchableOpacity
        onPress={handleWidgetTap}
        disabled={isCheckedIn || checkingIn}
        activeOpacity={0.8}
        style={[
          styles.actionButton,
          {
            backgroundColor: isCheckedIn
              ? colors.success
              : skyConfig.accent,
            borderRadius: borderRadius.md,
          },
        ]}
      >
        {checkingIn ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : isCheckedIn ? (
          <View style={styles.buttonInner}>
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={[typography.bodyMedium, { color: '#FFFFFF', fontWeight: '700' }]}>Checked In</Text>
          </View>
        ) : (
          <View style={styles.buttonInner}>
            <Ionicons name="radio-button-on" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={[typography.bodyMedium, { color: '#FFFFFF', fontWeight: '700' }]}>Tap to Check In Directly</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyContent: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widgetIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  flameCounter: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  actionButton: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
