import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/core/theme';
import { Button } from '@/components/common';
import { NUDGE_PHRASES, NudgePhrase, getRandomNudgePhrase } from '@/core/constants/nudgePhrases';
import { nudgeService } from '@/features/streaks/services/nudgeService';

interface NudgeModalProps {
  visible: boolean;
  onClose: () => void;
  streakId: string;
  streakName: string;
  friendUid: string;
  friendName: string;
  currentUserId: string;
  currentUserName: string;
  onNudgeSent: (phrase: string) => void;
}

export const NudgeModal = ({
  visible,
  onClose,
  streakId,
  streakName,
  friendUid,
  friendName,
  currentUserId,
  currentUserName,
  onNudgeSent,
}: NudgeModalProps) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [selectedPhrase, setSelectedPhrase] = useState(() =>
    getRandomNudgePhrase(friendName.split(' ')[0], streakName).phrase
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const firstName = friendName.split(' ')[0];

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'unhinged_guilt', label: '🦉 Guilt' },
    { key: 'fiery_urgency', label: '🚨 Urgency' },
    { key: 'doom_scrolling', label: '🧐 Call Out' },
    { key: 'playful_hype', label: '🙌 Hype' },
  ];

  const handleShuffle = () => {
    const pool = selectedCategory === 'all'
      ? NUDGE_PHRASES
      : NUDGE_PHRASES.filter((p) => p.category === selectedCategory);
    const randomIndex = Math.floor(Math.random() * pool.length);
    setSelectedPhrase(pool[randomIndex].template(firstName, streakName));
  };

  const handleSelectPhrase = (phraseItem: NudgePhrase) => {
    setSelectedPhrase(phraseItem.template(firstName, streakName));
  };

  const filteredPhrases = selectedCategory === 'all'
    ? NUDGE_PHRASES
    : NUDGE_PHRASES.filter((p) => p.category === selectedCategory);

  const handleSend = async () => {
    setSending(true);
    try {
      await nudgeService.sendNudge({
        streakId,
        streakName,
        fromUid: currentUserId,
        fromName: currentUserName,
        toUid: friendUid,
        toName: friendName,
        customPhrase: selectedPhrase,
      });

      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onNudgeSent(selectedPhrase);
        onClose();
      }, 1200);
    } catch (err) {
      console.warn('Failed to send nudge:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accentMuted }]}>
                <Ionicons name="flash" size={20} color={colors.accent} />
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={[typography.title3, { color: colors.textPrimary }]}>
                  Nudge {firstName}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Duolingo-style streak wake-up call
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Preview Bubble */}
          <View style={[styles.previewBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
            <View style={styles.previewTop}>
              <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
                NOTIFICATION PREVIEW
              </Text>
              <TouchableOpacity onPress={handleShuffle} style={styles.shuffleBtn}>
                <Ionicons name="shuffle" size={14} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
                  Shuffle
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontStyle: 'italic', marginTop: 8 }]}>
              "{selectedPhrase}"
            </Text>

            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8, textAlign: 'right' }]}>
              Sent from {currentUserName}
            </Text>
          </View>

          {/* Phrase Quick Picks */}
          <Text style={[typography.headline, { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
            Choose or Customize Punchline
          </Text>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.surfaceSubtle,
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      borderRadius: borderRadius.full,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      marginRight: 6,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: isSelected ? colors.accentForeground : colors.textSecondary, fontWeight: '700' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.phrasesScroll} showsVerticalScrollIndicator={false}>
            {filteredPhrases.map((item) => {
              const text = item.template(firstName, streakName);
              const isSelected = selectedPhrase === text;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSelectPhrase(item)}
                  style={[
                    styles.phraseItem,
                    {
                      backgroundColor: isSelected ? colors.surfaceSubtle : 'transparent',
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 18, marginRight: spacing.sm }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isSelected ? colors.accent : colors.textSecondary,
                          fontWeight: '700',
                          marginBottom: 2,
                        },
                      ]}
                    >
                      {item.categoryLabel}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        typography.caption,
                        { color: isSelected ? colors.textPrimary : colors.textSecondary },
                      ]}
                    >
                      {text}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.accent} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action Button */}
          {sentSuccess ? (
            <View style={[styles.successBanner, { backgroundColor: colors.successMuted, borderRadius: borderRadius.md }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: 6 }} />
              <Text style={[typography.bodyMedium, { color: colors.success, fontWeight: '700' }]}>
                Nudge Delivered! ⚡
              </Text>
            </View>
          ) : (
            <Button
              title={`Send Nudge to ${firstName} ⚡`}
              variant="primary"
              size="lg"
              loading={sending}
              onPress={handleSend}
              style={{ marginTop: spacing.base }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catPill: {
    borderWidth: 1,
  },
  phrasesScroll: {
    maxHeight: 210,
    marginTop: 6,
  },
  phraseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 16,
  },
});
