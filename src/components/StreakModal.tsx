import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { useGameStore } from '../state/store';
import { PressableScale } from './PressableScale';

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
}

export function StreakModal({ visible, onClose }: StreakModalProps) {
  const streak = useGameStore((s) => s.streak);
  const claimStreak = useGameStore((s) => s.claimStreak);
  const canClaimStreak = useGameStore((s) => s.canClaimStreak);
  const [claimed, setClaimed] = useState(false);

  const alreadyClaimedToday = !canClaimStreak();

  function handleTapMoon() {
    if (alreadyClaimedToday) {
      onClose();
      return;
    }
    claimStreak();
    setClaimed(true);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={() => setClaimed(false)}
    >
      <Pressable style={styles.backdrop} onPress={claimed ? onClose : undefined}>
        <Text style={styles.star1}>✦</Text>
        <Text style={styles.star2}>✦</Text>
        <Text style={styles.star3}>✦</Text>

        <View style={styles.dayBadge}>
          <Text style={styles.dayNumber}>{streak + (claimed ? 0 : 1)}</Text>
        </View>

        <PressableScale style={styles.moonWrap} scaleTo={0.88} onPress={handleTapMoon}>
          <Text style={styles.moon}>🌙</Text>
        </PressableScale>

        <Text style={styles.caption}>
          {claimed
            ? `${streak} nuit${streak > 1 ? 's' : ''} survécue${streak > 1 ? 's' : ''} !`
            : alreadyClaimedToday
            ? 'Nuit déjà survécue aujourd’hui'
            : 'Touchez la lune,\nsurvivez à la nuit !'}
        </Text>

        {claimed && (
          <PressableScale style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Continuer</Text>
          </PressableScale>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 24,
  },
  star1: {
    position: 'absolute',
    top: 90,
    left: 48,
    color: colors.accentSecondary,
    fontSize: 16,
    opacity: 0.7,
  },
  star2: {
    position: 'absolute',
    top: 150,
    right: 64,
    color: colors.accentSecondary,
    fontSize: 10,
    opacity: 0.5,
  },
  star3: {
    position: 'absolute',
    bottom: 140,
    left: 70,
    color: colors.accentSecondary,
    fontSize: 12,
    opacity: 0.6,
  },
  dayBadge: {
    position: 'absolute',
    top: 60,
    right: 32,
    opacity: 0.5,
  },
  dayNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.accent,
  },
  moonWrap: {
    padding: 24,
  },
  moon: {
    fontSize: 120,
  },
  caption: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.surface,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  doneButtonText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '700',
  },
});
