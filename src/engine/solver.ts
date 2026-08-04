import type { Conflict, Puzzle } from './types';

/** Counts solutions to a regioned "no-touch queens" puzzle, stopping early
 * once `limit` distinct solutions have been found. Used to guarantee every
 * generated puzzle has exactly one solution. */
export function countSolutions(
  size: number,
  regions: number[][],
  limit = 2
): number {
  const usedCols = new Array<boolean>(size).fill(false);
  const usedRegions = new Array<boolean>(size).fill(false);
  let found = 0;

  function backtrack(row: number, prevCol: number): void {
    if (found >= limit) return;
    if (row === size) {
      found++;
      return;
    }
    for (let col = 0; col < size; col++) {
      if (found >= limit) return;
      if (usedCols[col]) continue;
      if (prevCol >= 0 && Math.abs(col - prevCol) <= 1) continue;
      const region = regions[row][col];
      if (usedRegions[region]) continue;

      usedCols[col] = true;
      usedRegions[region] = true;
      backtrack(row + 1, col);
      usedCols[col] = false;
      usedRegions[region] = false;
    }
  }

  backtrack(0, -1);
  return found;
}

export function hasUniqueSolution(puzzle: Pick<Puzzle, 'size' | 'regions'>): boolean {
  return countSolutions(puzzle.size, puzzle.regions, 2) === 1;
}

/** Returns up to `limit` distinct valid cat placements (column per row).
 * Used by the generator to find alternate solutions it needs to break. */
export function findSolutions(
  size: number,
  regions: number[][],
  limit = 2
): number[][] {
  const usedCols = new Array<boolean>(size).fill(false);
  const usedRegions = new Array<boolean>(size).fill(false);
  const current = new Array<number>(size).fill(-1);
  const results: number[][] = [];

  function backtrack(row: number, prevCol: number): void {
    if (results.length >= limit) return;
    if (row === size) {
      results.push(current.slice());
      return;
    }
    for (let col = 0; col < size; col++) {
      if (results.length >= limit) return;
      if (usedCols[col]) continue;
      if (prevCol >= 0 && Math.abs(col - prevCol) <= 1) continue;
      const region = regions[row][col];
      if (usedRegions[region]) continue;

      usedCols[col] = true;
      usedRegions[region] = true;
      current[row] = col;
      backtrack(row + 1, col);
      usedCols[col] = false;
      usedRegions[region] = false;
    }
  }

  backtrack(0, -1);
  return results;
}

/** Finds every rule violation among the cats the player has currently
 * placed, so the board can highlight them live. */
export function findConflicts(
  size: number,
  regions: number[][],
  cats: Array<{ row: number; col: number }>
): Conflict[] {
  const conflicts = new Map<string, Conflict>();
  const add = (row: number, col: number, reason: Conflict['reason']) => {
    conflicts.set(`${row},${col}`, { row, col, reason });
  };

  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      const a = cats[i];
      const b = cats[j];
      if (a.row === b.row) {
        add(a.row, a.col, 'row');
        add(b.row, b.col, 'row');
      }
      if (a.col === b.col) {
        add(a.row, a.col, 'col');
        add(b.row, b.col, 'col');
      }
      if (regions[a.row][a.col] === regions[b.row][b.col]) {
        add(a.row, a.col, 'region');
        add(b.row, b.col, 'region');
      }
      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
        add(a.row, a.col, 'adjacent');
        add(b.row, b.col, 'adjacent');
      }
    }
  }

  return Array.from(conflicts.values());
}

/** True once the player has placed exactly one non-conflicting cat per
 * row, column and region — i.e. the puzzle is solved. */
export function isSolved(
  size: number,
  regions: number[][],
  cats: Array<{ row: number; col: number }>
): boolean {
  if (cats.length !== size) return false;
  if (findConflicts(size, regions, cats).length > 0) return false;
  const rows = new Set(cats.map((c) => c.row));
  const cols = new Set(cats.map((c) => c.col));
  const regs = new Set(cats.map((c) => regions[c.row][c.col]));
  return rows.size === size && cols.size === size && regs.size === size;
}
