import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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
}

export function Board({
  size,
  regions,
  grid,
  conflictKeys,
  hintCell,
  onCellPress,
}: BoardProps) {
  const { width } = useWindowDimensions();
  const boardMax = 440;
  const boardSize = Math.min(width - 48, boardMax);
  const cellSize = useMemo(() => Math.floor(boardSize / size), [boardSize, size]);

  return (
    <View style={[styles.board, { width: cellSize * size }]}>
      {grid.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cellState, c) => (
            <Cell
              key={c}
              state={cellState}
              regionId={regions[r][c]}
              conflict={conflictKeys.has(`${r},${c}`)}
              hinted={hintCell?.row === r && hintCell?.col === c}
              size={cellSize}
              onPress={() => onCellPress(r, c)}
            />
          ))}
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
