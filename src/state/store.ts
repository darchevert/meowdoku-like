import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
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

  // Power-ups
  useHint: () => boolean;
  useAutoCat: () => boolean;
  buyHint: () => boolean;
  buyAutoCat: () => boolean;

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
}

const HINT_COST_FISH = 3;
const AUTOCAT_COST_FISH = 3;

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
    }),
    {
      name: 'meowdoku-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
