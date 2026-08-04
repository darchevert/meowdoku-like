/** Board grows as the player advances, capping out once the grid gets
 * unwieldy on a phone screen. Level 21 is where the real app unlocks the
 * daily challenge, so campaign difficulty keeps ramping well past that. */
const SIZE_THRESHOLDS: Array<{ upTo: number; size: number }> = [
  { upTo: 2, size: 4 },
  { upTo: 5, size: 5 },
  { upTo: 9, size: 6 },
  { upTo: 14, size: 7 },
  { upTo: 20, size: 8 },
  { upTo: 30, size: 9 },
];
// Generation time grows steeply past 9x9 (region-repair search gets
// combinatorial), so campaign difficulty plateaus there.
const MAX_SIZE = 9;

export function levelToSize(level: number): number {
  for (const { upTo, size } of SIZE_THRESHOLDS) {
    if (level <= upTo) return size;
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
