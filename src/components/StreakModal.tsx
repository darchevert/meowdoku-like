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

  function handleTapSun() {
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
        <View style={styles.dayBadge}>
          <Text style={styles.dayNumber}>{streak + (claimed ? 0 : 1)}</Text>
        </View>

        <PressableScale style={styles.sunWrap} scaleTo={0.88} onPress={handleTapSun}>
          <Text style={styles.sun}>☀️</Text>
        </PressableScale>

        <Text style={styles.caption}>
          {claimed
            ? `Série de ${streak} jour${streak > 1 ? 's' : ''} !`
            : alreadyClaimedToday
            ? 'Série déjà allumée aujourd’hui'
            : 'Touchez le soleil, allumez\nvotre série !'}
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
    backgroundColor: '#FBEFD9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 24,
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
  sunWrap: {
    padding: 24,
  },
  sun: {
    fontSize: 120,
  },
  caption: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
