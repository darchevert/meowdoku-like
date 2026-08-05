import type { Puzzle } from './types';
import { findSolutions, hasUniqueSolution } from './solver';

const DELTAS: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random permutation of columns, one per row, where no two cats in
 * consecutive rows sit within one column of each other (the "no touching,
 * including diagonally" rule). Cats in non-adjacent rows can never touch,
 * so only consecutive rows need checking. */
function generateSolution(size: number): number[] | null {
  const usedCols = new Array<boolean>(size).fill(false);
  const solution = new Array<number>(size).fill(-1);

  function backtrack(row: number, prevCol: number): boolean {
    if (row === size) return true;
    for (const col of shuffled(Array.from({ length: size }, (_, i) => i))) {
      if (usedCols[col]) continue;
      if (prevCol >= 0 && Math.abs(col - prevCol) <= 1) continue;
      usedCols[col] = true;
      solution[row] = col;
      if (backtrack(row + 1, col)) return true;
      usedCols[col] = false;
    }
    return false;
  }

  return backtrack(0, -1) ? solution : null;
}

/** Grows `size` connected, irregularly-shaped regions outward from the
 * solution cells until they tile the whole board — a randomized
 * multi-source flood fill, similar to a Voronoi diagram with jitter. */
function growRegions(size: number, solution: number[]): number[][] {
  const regions: number[][] = Array.from({ length: size }, () =>
    new Array<number>(size).fill(-1)
  );
  const frontiers: Array<Array<[number, number]>> = [];

  for (let r = 0; r < size; r++) {
    const c = solution[r];
    regions[r][c] = r;
    frontiers.push([[r, c]]);
  }

  const cellCounts = new Array<number>(size).fill(1);
  let remaining = size * size - size;
  let activeRegions = Array.from({ length: size }, (_, i) => i);

  while (remaining > 0) {
    activeRegions = activeRegions.filter((r) => frontiers[r].length > 0);
    if (activeRegions.length === 0) break;

    // Softly bias growth toward smaller regions (weighted random, not a
    // strict minimum) so sizes stay in a reasonable range without ending
    // up perfectly uniform — real levels have some small and some large
    // regions.
    const weights = activeRegions.map((r) => 1 / (cellCounts[r] + 2));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let pick = Math.random() * totalWeight;
    let region = activeRegions[activeRegions.length - 1];
    for (let i = 0; i < activeRegions.length; i++) {
      pick -= weights[i];
      if (pick <= 0) {
        region = activeRegions[i];
        break;
      }
    }
    const frontier = frontiers[region];
    const idx = Math.floor(Math.random() * frontier.length);
    const [row, col] = frontier[idx];
    frontier.splice(idx, 1);

    for (const [dr, dc] of shuffled(DELTAS)) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (regions[nr][nc] !== -1) continue;
      regions[nr][nc] = region;
      remaining--;
      cellCounts[region]++;
      frontier.push([nr, nc]);
    }
  }

  // Any cell unreachable from its own region's growth (fully boxed in by
  // faster-growing neighbors) gets absorbed by an adjacent region.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] !== -1) continue;
      for (const [dr, dc] of DELTAS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] !== -1) {
          regions[r][c] = regions[nr][nc];
          break;
        }
      }
    }
  }

  return regions;
}

function isConnected(
  regions: number[][],
  size: number,
  regionId: number,
  excluding: [number, number]
): boolean {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] !== regionId) continue;
      if (r === excluding[0] && c === excluding[1]) continue;
      cells.push([r, c]);
    }
  }
  if (cells.length <= 1) return true;

  const visited = new Set<string>([`${cells[0][0]},${cells[0][1]}`]);
  const stack: Array<[number, number]> = [cells[0]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    for (const [dr, dc] of DELTAS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr === excluding[0] && nc === excluding[1]) continue;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (regions[nr][nc] !== regionId) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      visited.add(key);
      stack.push([nr, nc]);
    }
  }
  return visited.size === cells.length;
}

/** A valid solution uses every region exactly once, so an alternate
 * solution's cat at (row, altCol) is the *only* cell representing its
 * region among that solution's cats. Reassigning that single cell to any
 * neighboring region drops its old region's count to zero in the
 * alternate placement, invalidating it as a solution — while the true
 * solution is untouched, since it never sits on this cell. Repair loops
 * until the solver finds nothing left to break, or `deadline` passes:
 * on larger boards the space of alternate solutions can be large enough
 * that proving uniqueness gets expensive, so callers bound how long any
 * single repair attempt is allowed to run. */
function tryRepairUniqueness(
  size: number,
  regions: number[][],
  solution: number[],
  deadline: number
): boolean {
  while (Date.now() < deadline) {
    const solutions = findSolutions(size, regions, 2, deadline);
    if (solutions.length <= 1) return true;

    const alt = solutions.find((s) => s.some((c, r) => c !== solution[r]));
    if (!alt) return true;

    const rows = shuffled(Array.from({ length: size }, (_, i) => i)).filter(
      (r) => alt[r] !== solution[r]
    );

    let repaired = false;
    for (const row of rows) {
      const altCol = alt[row];
      const curReg = regions[row][altCol];

      const neighborRegions = new Set<number>();
      for (const [dr, dc] of DELTAS) {
        const nr = row + dr;
        const nc = altCol + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (regions[nr][nc] !== curReg) neighborRegions.add(regions[nr][nc]);
      }
      if (neighborRegions.size === 0) continue;
      if (!isConnected(regions, size, curReg, [row, altCol])) continue;

      const options = shuffled(Array.from(neighborRegions));
      regions[row][altCol] = options[0];
      repaired = true;
      break;
    }

    if (!repaired) return false;
  }
  return false;
}

/** Total time budget for a single generatePuzzle call. Region-repair cost
 * grows steeply with board size (more alternate solutions to search
 * through and break), so bigger boards get more time — but always a
 * bounded amount, so the UI's "generating..." spinner never hangs. */
function budgetForSize(size: number): number {
  return Math.min(2500, Math.max(400, size * 90));
}

/** Generates a puzzle. Any region layout grown from a solution is always
 * fully playable — the solution's own cells never move, so it always
 * remains one valid answer — the only question is whether it's the
 * *only* one. Strict uniqueness is proven for small-to-medium boards
 * within the time budget; on the largest boards (roughly 12x12+) the
 * search space of alternate solutions can outgrow that budget, so
 * generation falls back to the best (typically still very constrained,
 * just not provably unique) layout found so far rather than blocking. */
export function generatePuzzle(size: number): Puzzle {
  const deadline = Date.now() + budgetForSize(size);
  let fallback: Puzzle | null = null;

  while (Date.now() < deadline) {
    const solution = generateSolution(size);
    if (!solution) continue;

    while (Date.now() < deadline) {
      const regions = growRegions(size, solution);
      const checkDeadline = Math.min(deadline, Date.now() + 150);
      if (hasUniqueSolution({ size, regions }, checkDeadline)) {
        return { size, regions, solution };
      }
      fallback = { size, regions, solution };

      const repairDeadline = Math.min(deadline, Date.now() + 150);
      if (tryRepairUniqueness(size, regions, solution, repairDeadline)) {
        return { size, regions, solution };
      }
      fallback = { size, regions, solution };
    }
  }

  if (fallback) return fallback;
  throw new Error(`Failed to generate a ${size}x${size} puzzle`);
}
