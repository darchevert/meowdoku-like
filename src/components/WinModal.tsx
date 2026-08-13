import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { PressableScale } from './PressableScale';

interface WinModalProps {
  visible: boolean;
  title: string;
  scoreEarned: number;
  fishEarned: number;
  primaryLabel: string;
  onPrimary: () => void;
  /** Omit to show only the primary button (e.g. the daily challenge,
   * which has no "next level" to skip past). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Only shown when timer mode is on. */
  elapsedSeconds?: number;
  isNewRecord?: boolean;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function WinModal({
  visible,
  title,
  scoreEarned,
  fishEarned,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  elapsedSeconds,
  isNewRecord,
}: WinModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.emoji}>🐱🎉</Text>
          <View style={styles.rewardsRow}>
            <Text style={styles.reward}>+{scoreEarned} points</Text>
            <Text style={styles.reward}>+{fishEarned} 🐟</Text>
          </View>
          {elapsedSeconds !== undefined && (
            <Text style={styles.timeText}>
              Temps : {formatTime(elapsedSeconds)}
              {isNewRecord ? ' — 🏆 Nouveau record !' : ''}
            </Text>
          )}
          <PressableScale style={styles.primaryButton} onPress={onPrimary}>
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </PressableScale>
          {secondaryLabel && onSecondary && (
            <PressableScale style={styles.secondaryButton} onPress={onSecondary}>
              <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
            </PressableScale>
          )}
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
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkSoft,
    marginTop: -6,
    marginBottom: 4,
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
