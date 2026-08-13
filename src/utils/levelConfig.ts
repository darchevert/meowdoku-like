/** Board grows as the player advances: level 1-2 start at 4x4, and each
 * larger size sticks around for one level longer than the last (2, 3, 4,
 * 5, ... levels) before growing again, so the ramp gets gentler exactly
 * as boards get harder. Caps at 16x16. */
const MIN_SIZE = 4;
const MAX_SIZE = 16;

export function levelToSize(level: number): number {
  let size = MIN_SIZE;
  let levelsUsedBySize = 0;
  let tierWidth = 2;
  while (size < MAX_SIZE) {
    levelsUsedBySize += tierWidth;
    if (level <= levelsUsedBySize) return size;
    size++;
    tierWidth++;
  }
  return MAX_SIZE;
}

export const DAILY_CHALLENGE_UNLOCK_LEVEL = 21;

/** Base score for a level scales with board size; hints and hint-cats
 * used along the way each cost points, mirroring the reference game's
 * light score pressure without punishing players for taking their time. */
export function baseLevelScore(size: number): number {
  return size * 100;
}

export function scoreForCompletion(
  size: number,
  hintsUsed: number,
  autoCatsUsed: number
): number {
  const base = baseLevelScore(size);
  const penalty = (hintsUsed + autoCatsUsed) * 25;
  return Math.max(base - penalty, size * 10);
}
