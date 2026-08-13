import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, regionColor } from '../theme/colors';
import type { CellState } from '../engine/types';

interface CellProps {
  state: CellState;
  regionId: number;
  conflict: boolean;
  hinted: boolean;
  size: number;
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

/** Purely presentational — the whole board's touches are handled by a
 * single PanResponder in Board (so a press-and-drag can paint across
 * cells), so this has no onPress of its own. */
export function Cell({ state, regionId, conflict, hinted, size }: CellProps) {
  const bg = regionColor(regionId);
  const gap = Math.max(1.5, size * 0.035);
  const radius = size * 0.22;
  const isWrong = state === 'wrong';

  return (
    <View
      style={[styles.hitArea, { width: size, height: size, padding: gap }]}
      accessible
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
    </View>
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
