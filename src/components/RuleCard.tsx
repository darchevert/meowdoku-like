import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type MiniCell = 'x' | 'cat' | 'blank';

interface RuleCardProps {
  grid: MiniCell[][];
  text: string;
}

export function RuleCard({ grid, text }: RuleCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.mini}>
        {grid.map((row, r) => (
          <View key={r} style={styles.miniRow}>
            {row.map((cell, c) => (
              <View key={c} style={styles.miniCell}>
                {cell === 'cat' && <Text style={styles.miniCat}>🐱</Text>}
                {cell === 'x' && <Text style={styles.miniX}>✕</Text>}
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const RULE_ONE_PER_COLOR: MiniCell[][] = [
  ['x', 'x', 'x'],
  ['x', 'cat', 'x'],
  ['x', 'blank', 'blank'],
];
const RULE_ONE_PER_LINE: MiniCell[][] = [
  ['x', 'x', 'cat'],
  ['x', 'cat', 'x'],
  ['cat', 'x', 'x'],
];
const RULE_NO_TOUCH: MiniCell[][] = [
  ['x', 'x', 'x'],
  ['x', 'cat', 'x'],
  ['x', 'x', 'x'],
];

export function RuleCards() {
  return (
    <View style={styles.row}>
      <RuleCard grid={RULE_ONE_PER_COLOR} text={'1 chat par\ncouleur'} />
      <RuleCard grid={RULE_ONE_PER_LINE} text={'1 chat par\nligne et colonne'} />
      <RuleCard grid={RULE_NO_TOUCH} text={'Les chats ne\npeuvent pas se toucher'} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 8,
    gap: 8,
  },
  mini: {
    width: 36,
    height: 36,
  },
  miniRow: {
    flexDirection: 'row',
    flex: 1,
  },
  miniCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent + '33',
    margin: 0.5,
    borderRadius: 2,
  },
  miniCat: {
    fontSize: 8,
  },
  miniX: {
    fontSize: 8,
    color: colors.inkSoft,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    fontSize: 11,
    color: colors.ink,
    lineHeight: 14,
  },
});
