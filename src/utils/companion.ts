/** The persistent companion: fed with fish (a use for the currency beyond
 * the hint/auto-cat shop), it gains XP and visibly evolves — a reason to
 * keep playing that isn't just "the next level," and the game's answer to
 * "what makes this different from every other Star Battle clone." */

const XP_PER_LEVEL = 50;

export interface CompanionTier {
  level: number;
  emoji: string;
  name: string;
}

export const COMPANION_TIERS: CompanionTier[] = [
  { level: 1, emoji: '🐱', name: 'Chaton' },
  { level: 2, emoji: '😺', name: 'Chat curieux' },
  { level: 3, emoji: '😸', name: 'Chat joueur' },
  { level: 4, emoji: '😻', name: 'Chat comblé' },
  { level: 5, emoji: '🐈', name: 'Chat élégant' },
  { level: 6, emoji: '🦁', name: 'Chat royal' },
];

export function companionLevel(xp: number): number {
  return Math.min(COMPANION_TIERS.length, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function companionTier(xp: number): CompanionTier {
  return COMPANION_TIERS[companionLevel(xp) - 1];
}

/** XP progress within the current level, for a progress bar — always 1
 * (full) once the last tier is reached, since there's nothing more to
 * grow into. */
export function companionProgress(xp: number): number {
  const level = companionLevel(xp);
  if (level >= COMPANION_TIERS.length) return 1;
  const xpIntoLevel = xp - (level - 1) * XP_PER_LEVEL;
  return Math.min(1, xpIntoLevel / XP_PER_LEVEL);
}

export interface Accessory {
  id: string;
  emoji: string;
  name: string;
  cost: number;
}

export const ACCESSORIES: Accessory[] = [
  { id: 'bow', emoji: '🎀', name: 'Nœud', cost: 15 },
  { id: 'glasses', emoji: '🕶️', name: 'Lunettes', cost: 20 },
  { id: 'scarf', emoji: '🧣', name: 'Écharpe', cost: 20 },
  { id: 'flower', emoji: '🌸', name: 'Fleur', cost: 15 },
  { id: 'crown', emoji: '👑', name: 'Couronne', cost: 40 },
];
