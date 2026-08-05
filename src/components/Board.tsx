import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Cell } from './Cell';
import { colors } from '../theme/colors';
import type { CellState } from '../engine/types';

interface BoardProps {
  size: number;
  regions: number[][];
  grid: CellState[][];
  conflictKeys: Set<string>;
  hintCell?: { row: number; col: number } | null;
  onCellPress: (row: number, col: number) => void;
  /** Changes whenever a genuinely new puzzle is loaded (not on every move)
   * — re-triggers the staggered reveal animation below. */
  revealKey: string | number;
}

const REVEAL_DURATION_MS = 700;

export function Board({
  size,
  regions,
  grid,
  conflictKeys,
  hintCell,
  onCellPress,
  revealKey,
}: BoardProps) {
  const { width } = useWindowDimensions();
  // Larger grids need every pixel they can get for touch targets to stay
  // usable, so bigger boards claim more of the screen width.
  const margin = size >= 12 ? 16 : 24;
  const boardMax = 320 + size * 14;
  const boardSize = Math.min(width - margin * 2, boardMax);
  const cellSize = useMemo(() => Math.floor(boardSize / size), [boardSize, size]);

  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: REVEAL_DURATION_MS,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey]);

  return (
    <View style={[styles.board, { width: cellSize * size }]}>
      {grid.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cellState, c) => {
            // Cells wake up in a diagonal-ish sweep (row+col order) rather
            // than strict reading order, which reads more like a ripple
            // than a typewriter.
            const index = r + c;
            const maxIndex = 2 * (size - 1) || 1;
            const start = (index / maxIndex) * 0.55;
            const end = Math.min(1, start + 0.45);
            const opacity = reveal.interpolate({
              inputRange: [start, end],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            });
            const scale = reveal.interpolate({
              inputRange: [start, end],
              outputRange: [0.4, 1],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View key={c} style={{ opacity, transform: [{ scale }] }}>
                <Cell
                  state={cellState}
                  regionId={regions[r][c]}
                  conflict={conflictKeys.has(`${r},${c}`)}
                  hinted={hintCell?.row === r && hintCell?.col === c}
                  size={cellSize}
                  onPress={() => onCellPress(r, c)}
                />
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
  },
});
