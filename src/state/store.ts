import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { todayKey } from '../utils/date';

export const AVATARS = [
  'cat',
  'panda',
  'dog',
  'crocodile',
  'chicken',
  'duck',
  'lion',
  'calico',
] as const;
export type AvatarId = (typeof AVATARS)[number];

export const AVATAR_EMOJI: Record<AvatarId, string> = {
  cat: '🐱',
  panda: '🐼',
  dog: '🐶',
  crocodile: '🐊',
  chicken: '🐔',
  duck: '🦆',
  lion: '🦁',
  calico: '🐈',
};

export const FRAMES = ['none', 'green', 'gold', 'blue', 'pink'] as const;
export type FrameId = (typeof FRAMES)[number];

function randomPlayerId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

interface GameState {
  // Profile
  playerId: string;
  avatar: AvatarId;
  frame: FrameId;
  setAvatar: (avatar: AvatarId) => void;
  setFrame: (frame: FrameId) => void;

  // Progression
  level: number;
  score: number;
  fish: number;
  hints: number;
  autoCats: number;
  completeLevel: (params: { scoreEarned: number; fishEarned: number }) => void;

  // Daily challenge — a single shared puzzle per calendar day, separate
  // from level progression (doesn't advance `level`).
  dailyChallengeCompletedDate: string | null;
  hasCompletedDailyToday: () => boolean;
  completeDailyChallenge: (params: { scoreEarned: number; fishEarned: number }) => void;

  // Power-ups
  useHint: () => boolean;
  useAutoCat: () => boolean;
  buyHint: () => boolean;
  buyAutoCat: () => boolean;
  /** A free hint charge earned by watching a rewarded ad — unlike
   * buyHint, never costs fish. */
  grantHint: () => void;

  // Streak
  streak: number;
  bestStreak: number;
  lastStreakClaimDate: string | null;
  canClaimStreak: () => boolean;
  claimStreak: () => void;

  // Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleHaptics: () => void;

  // Zen mode — level play with no lives/lose condition, off by default so
  // the default experience keeps its stakes. Never applies to the daily
  // challenge (see GameScreen), which is meant to stay a real one-shot.
  zenModeEnabled: boolean;
  toggleZenMode: () => void;

  // Timer mode — off by default (a visible clock adds pressure some
  // players don't want). Best time is kept per board size since regular
  // levels regenerate a fresh board of that size each time, so "the
  // level" isn't a stable thing to compare across attempts — the size is.
  timerModeEnabled: boolean;
  toggleTimerMode: () => void;
  bestTimeBySize: Record<number, number>;
  /** Returns true if this run beat (or set) the record for that size. */
  recordBestTime: (size: number, seconds: number) => boolean;

  // Companion — a persistent pet fed with fish, giving them a use beyond
  // the hint/auto-cat shop. XP-based level with emoji tiers, plus
  // separately unlockable/equippable cosmetic accessories.
  companionXp: number;
  unlockedAccessories: string[];
  equippedAccessory: string | null;
  feedCompanion: () => boolean;
  unlockAccessory: (id: string, cost: number) => boolean;
  equipAccessory: (id: string | null) => void;
}

const HINT_COST_FISH = 3;
const AUTOCAT_COST_FISH = 3;
const FEED_COST_FISH = 2;
const FEED_XP_GAIN = 10;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      playerId: randomPlayerId(),
      avatar: 'duck',
      frame: 'green',
      setAvatar: (avatar) => set({ avatar }),
      setFrame: (frame) => set({ frame }),

      level: 1,
      score: 0,
      fish: 10,
      hints: 5,
      autoCats: 5,
      completeLevel: ({ scoreEarned, fishEarned }) =>
        set((s) => ({
          level: s.level + 1,
          score: s.score + scoreEarned,
          fish: s.fish + fishEarned,
        })),

      dailyChallengeCompletedDate: null,
      hasCompletedDailyToday: () => get().dailyChallengeCompletedDate === todayKey(),
      completeDailyChallenge: ({ scoreEarned, fishEarned }) => {
        const today = todayKey();
        if (get().dailyChallengeCompletedDate === today) return;
        set((s) => ({
          dailyChallengeCompletedDate: today,
          score: s.score + scoreEarned,
          fish: s.fish + fishEarned,
        }));
      },

      useHint: () => {
        const { hints } = get();
        if (hints <= 0) return false;
        set({ hints: hints - 1 });
        return true;
      },
      useAutoCat: () => {
        const { autoCats } = get();
        if (autoCats <= 0) return false;
        set({ autoCats: autoCats - 1 });
        return true;
      },
      buyHint: () => {
        const { fish } = get();
        if (fish < HINT_COST_FISH) return false;
        set((s) => ({ fish: s.fish - HINT_COST_FISH, hints: s.hints + 1 }));
        return true;
      },
      buyAutoCat: () => {
        const { fish } = get();
        if (fish < AUTOCAT_COST_FISH) return false;
        set((s) => ({ fish: s.fish - AUTOCAT_COST_FISH, autoCats: s.autoCats + 1 }));
        return true;
      },
      grantHint: () => set((s) => ({ hints: s.hints + 1 })),

      streak: 0,
      bestStreak: 0,
      lastStreakClaimDate: null,
      canClaimStreak: () => get().lastStreakClaimDate !== todayKey(),
      claimStreak: () => {
        const { lastStreakClaimDate, streak, bestStreak } = get();
        const today = todayKey();
        if (lastStreakClaimDate === today) return;

        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        const nextStreak = lastStreakClaimDate === yesterday ? streak + 1 : 1;
        set({
          streak: nextStreak,
          bestStreak: Math.max(bestStreak, nextStreak),
          lastStreakClaimDate: today,
          fish: get().fish + 2,
        });
      },

      soundEnabled: true,
      musicEnabled: true,
      hapticsEnabled: true,
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),

      zenModeEnabled: false,
      toggleZenMode: () => set((s) => ({ zenModeEnabled: !s.zenModeEnabled })),

      timerModeEnabled: false,
      toggleTimerMode: () => set((s) => ({ timerModeEnabled: !s.timerModeEnabled })),
      bestTimeBySize: {},
      recordBestTime: (size, seconds) => {
        const current = get().bestTimeBySize[size];
        if (current !== undefined && current <= seconds) return false;
        set((s) => ({ bestTimeBySize: { ...s.bestTimeBySize, [size]: seconds } }));
        return true;
      },

      companionXp: 0,
      unlockedAccessories: [],
      equippedAccessory: null,
      feedCompanion: () => {
        const { fish } = get();
        if (fish < FEED_COST_FISH) return false;
        set((s) => ({ fish: s.fish - FEED_COST_FISH, companionXp: s.companionXp + FEED_XP_GAIN }));
        return true;
      },
      unlockAccessory: (id, cost) => {
        const { fish, unlockedAccessories } = get();
        if (unlockedAccessories.includes(id)) return true;
        if (fish < cost) return false;
        set((s) => ({
          fish: s.fish - cost,
          unlockedAccessories: [...s.unlockedAccessories, id],
        }));
        return true;
      },
      equipAccessory: (id) => set({ equippedAccessory: id }),
    }),
    {
      name: 'meowdoku-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
