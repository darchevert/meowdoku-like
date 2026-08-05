/** 'wrong' is a locked-in mistake: a losing double-tap guess. It behaves
 * like 'x' for puzzle logic (excluded, not a cat) but is rendered as a
 * red cross and can never be changed back — a permanent record of the
 * life it cost. */
export type CellState = 'empty' | 'x' | 'wrong' | 'cat';

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
