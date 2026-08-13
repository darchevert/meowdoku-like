import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface ProgressBadgesProps {
  catsPlaced: number;
  catsTotal: number;
  lives: number;
  maxLives: number;
  /** Replaces the lives pill with a "no stakes" badge — used for zen-mode
   * level play, where wrong guesses don't cost anything. */
  zen?: boolean;
}

export function ProgressBadges({ catsPlaced, catsTotal, lives, maxLives, zen }: ProgressBadgesProps) {
  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Text style={styles.emoji}>🐱</Text>
        <Text style={styles.count}>
          {catsPlaced}/{catsTotal}
        </Text>
      </View>
      {zen ? (
        <View style={styles.pill}>
          <Text style={styles.emoji}>🧘</Text>
          <Text style={styles.count}>Zen</Text>
        </View>
      ) : (
        <View style={styles.pill}>
          {Array.from({ length: maxLives }).map((_, i) => (
            <Text key={i} style={[styles.fish, i >= lives && styles.fishLost]}>
              🐟
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  emoji: {
    fontSize: 16,
  },
  fish: {
    fontSize: 16,
  },
  fishLost: {
    opacity: 0.2,
  },
  count: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
});
