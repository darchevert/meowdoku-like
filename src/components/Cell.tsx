import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, regionColor } from '../theme/colors';
import type { CellState } from '../engine/types';

interface CellProps {
  state: CellState;
  regionId: number;
  conflict: boolean;
  hinted: boolean;
  size: number;
  onPress: () => void;
}

/** A chunky, rounded-stroke X built from two crossed bars, matching the
 * reference game's thick icon-style cross rather than a thin text glyph. */
function XMark({ size, color }: { size: number; color: string }) {
  const barLength = size * 0.62;
  const barThickness = Math.max(4, size * 0.17);
  const barStyle = {
    position: 'absolute' as const,
    width: barLength,
    height: barThickness,
    borderRadius: barThickness / 2,
    backgroundColor: color,
  };
  return (
    <View style={styles.markWrap} pointerEvents="none">
      <View style={[barStyle, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[barStyle, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

export function Cell({ state, regionId, conflict, hinted, size, onPress }: CellProps) {
  const bg = regionColor(regionId);
  const gap = Math.max(1.5, size * 0.035);
  const radius = size * 0.22;
  const isWrong = state === 'wrong';

  return (
    <Pressable
      onPress={onPress}
      disabled={isWrong}
      style={({ pressed }) => [
        styles.hitArea,
        { width: size, height: size, padding: gap, opacity: pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        state === 'cat'
          ? 'Chat'
          : state === 'wrong'
          ? 'Erreur, case définitivement exclue'
          : state === 'x'
          ? 'Case exclue'
          : 'Case vide'
      }
    >
      <View
        style={[
          styles.inner,
          { backgroundColor: bg, borderRadius: radius },
          conflict && styles.conflict,
          hinted && styles.hinted,
        ]}
      >
        {state === 'cat' && (
          <Text style={[styles.catEmoji, { fontSize: size * 0.58 }]}>🐱</Text>
        )}
        {state === 'x' && <XMark size={size} color="rgba(255,255,255,0.92)" />}
        {isWrong && <XMark size={size} color={colors.danger} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflict: {
    borderWidth: 3,
    borderColor: colors.danger,
  },
  hinted: {
    borderWidth: 3,
    borderColor: colors.accentDark,
  },
  markWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: {
    textAlign: 'center',
  },
});
