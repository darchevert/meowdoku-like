export type CellState = 'empty' | 'x' | 'cat';

/** A generated puzzle: an NxN board partitioned into N connected color
 * regions, with exactly one valid "cat" placement per row/column/region
 * such that no two cats touch (including diagonally). */
export interface Puzzle {
  size: number;
  /** regions[row][col] -> region id in [0, size) */
  regions: number[][];
  /** solution[row] -> column of the cat in that row */
  solution: number[];
}

export interface Conflict {
  row: number;
  col: number;
  reason: 'row' | 'col' | 'region' | 'adjacent';
}
