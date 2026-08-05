import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { PressableScale } from './PressableScale';

interface LoseModalProps {
  visible: boolean;
  level: number;
  onRetry: () => void;
  onHome: () => void;
}

export function LoseModal({ visible, level, onRetry, onHome }: LoseModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Niveau {level} raté</Text>
          <Text style={styles.emoji}>🐱💔</Text>
          <Text style={styles.subtitle}>Plus de vies pour ce niveau</Text>
          <PressableScale style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>Réessayer</Text>
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
  subtitle: {
    fontSize: 15,
    color: colors.inkSoft,
    marginBottom: 8,
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
