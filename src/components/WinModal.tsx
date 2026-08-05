import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { PressableScale } from './PressableScale';

interface WinModalProps {
  visible: boolean;
  level: number;
  scoreEarned: number;
  fishEarned: number;
  onNext: () => void;
  onHome: () => void;
}

export function WinModal({
  visible,
  level,
  scoreEarned,
  fishEarned,
  onNext,
  onHome,
}: WinModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Niveau {level} terminé !</Text>
          <Text style={styles.emoji}>🐱🎉</Text>
          <View style={styles.rewardsRow}>
            <Text style={styles.reward}>+{scoreEarned} points</Text>
            <Text style={styles.reward}>+{fishEarned} 🐟</Text>
          </View>
          <PressableScale style={styles.primaryButton} onPress={onNext}>
            <Text style={styles.primaryButtonText}>Niveau suivant</Text>
          </PressableScale>
          <PressableScale style={styles.secondaryButton} onPress={onHome}>
            <Text style={styles.secondaryButtonText}>Accueil</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  emoji: {
    fontSize: 40,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  reward: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.inkSoft,
    fontSize: 15,
    fontWeight: '600',
  },
});
