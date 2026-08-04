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

export function Cell({ state, regionId, conflict, hinted, size, onPress }: CellProps) {
  const bg = regionColor(regionId);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor: bg,
          opacity: pressed ? 0.8 : 1,
        },
        conflict && styles.conflict,
        hinted && styles.hinted,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        state === 'cat' ? 'Chat' : state === 'x' ? 'Case exclue' : 'Case vide'
      }
    >
      {state === 'cat' && (
        <View style={[styles.catBadge, conflict && styles.catBadgeConflict]}>
          <Text style={styles.catEmoji}>🐱</Text>
        </View>
      )}
      {state === 'x' && <Text style={styles.xMark}>✕</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  conflict: {
    borderWidth: 2,
    borderColor: colors.danger,
  },
  hinted: {
    borderWidth: 3,
    borderColor: colors.accentDark,
  },
  xMark: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
    fontWeight: '700',
  },
  catBadge: {
    width: '78%',
    height: '78%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBadgeConflict: {
    backgroundColor: 'rgba(224,85,79,0.45)',
  },
  catEmoji: {
    fontSize: 20,
  },
});
