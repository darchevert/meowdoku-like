import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Board } from '../components/Board';
import { TopBar } from '../components/TopBar';
import { RuleCards } from '../components/RuleCard';
import { ProgressBadges } from '../components/ProgressBadges';
import { PowerButton } from '../components/PowerButton';
import { WinModal } from '../components/WinModal';
import { LoseModal } from '../components/LoseModal';
import { Celebration, type CelebrationTrigger } from '../components/Celebration';
import { generatePuzzle } from '../engine/generator';
import { findConflicts, isSolved } from '../engine/solver';
import type { CellState, Puzzle } from '../engine/types';
import { levelToSize, scoreForCompletion } from '../utils/levelConfig';
import { playSound } from '../utils/sounds';
import { useGameStore } from '../state/store';
import { colors } from '../theme/colors';
import { MAX_CONTENT_WIDTH } from '../theme/layout';

const FISH_REWARD = 3;
const HINT_HIGHLIGHT_MS = 2500;
const MAX_LIVES = 3;
const DOUBLE_TAP_MS = 300;
const CELEBRATION_WORDS = ['Excellent !', 'Génial !', 'Incroyable !', 'Bravo !', 'Parfait !', 'Superbe !'];

function emptyGrid(size: number): CellState[][] {
  return Array.from({ length: size }, () => new Array<CellState>(size).fill('empty'));
}

interface GameScreenProps {
  onBack: () => void;
  onSettings: () => void;
}

export function GameScreen({ onBack, onSettings }: GameScreenProps) {
  const level = useGameStore((s) => s.level);
  const score = useGameStore((s) => s.score);
  const hints = useGameStore((s) => s.hints);
  const autoCats = useGameStore((s) => s.autoCats);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const useHintCharge = useGameStore((s) => s.useHint);
  const useAutoCatCharge = useGameStore((s) => s.useAutoCat);
  const buyHint = useGameStore((s) => s.buyHint);
  const buyAutoCat = useGameStore((s) => s.buyAutoCat);
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const soundEnabled = useGameStore((s) => s.soundEnabled);

  // The puzzle on screen tracks its own level rather than the store's
  // (which advances the instant a level is completed): otherwise the win
  // modal would find its level already stale and a fresh board already
  // generated underneath it before the player ever sees "Niveau suivant".
  const [activeLevel, setActiveLevel] = useState(level);
  // Bumped on retry so a fresh puzzle regenerates for the *same* level.
  const [attempt, setAttempt] = useState(0);
  const size = levelToSize(activeLevel);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [loading, setLoading] = useState(true);
  const [hintCell, setHintCell] = useState<{ row: number; col: number } | null>(null);
  const [won, setWon] = useState(false);
  const [lives, setLives] = useState(MAX_LIVES);
  const [lost, setLost] = useState(false);
  const [lastReward, setLastReward] = useState({ score: 0, fish: 0 });
  const [hintsUsed, setHintsUsed] = useState(0);
  const [autoCatsUsed, setAutoCatsUsed] = useState(0);

  const lastTapRef = useRef<{ row: number; col: number; time: number } | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const celebrationIdRef = useRef(0);
  const [celebration, setCelebration] = useState<CelebrationTrigger | null>(null);

  function playIfEnabled(key: Parameters<typeof playSound>[0]) {
    if (soundEnabled) playSound(key);
  }

  function triggerCelebration() {
    celebrationIdRef.current += 1;
    const word = CELEBRATION_WORDS[Math.floor(Math.random() * CELEBRATION_WORDS.length)];
    setCelebration({ id: celebrationIdRef.current, word });
  }

  /** A quick horizontal wobble plus a haptic buzz — the physical "no"
   * feedback for a wrong guess, on top of the red locked cross itself. */
  function triggerWrongFeedback() {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => {
    setLoading(true);
    setWon(false);
    setLost(false);
    setLives(MAX_LIVES);
    setHintCell(null);
    setHintsUsed(0);
    setAutoCatsUsed(0);
    lastTapRef.current = null;
    const timer = setTimeout(() => {
      const p = generatePuzzle(size);
      setPuzzle(p);
      setGrid(emptyGrid(size));
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel, attempt]);

  const cats = useMemo(() => {
    const list: Array<{ row: number; col: number }> = [];
    grid.forEach((row, r) =>
      row.forEach((cellState, c) => {
        if (cellState === 'cat') list.push({ row: r, col: c });
      })
    );
    return list;
  }, [grid]);

  const conflictKeys = useMemo(() => {
    if (!puzzle) return new Set<string>();
    const conflicts = findConflicts(puzzle.size, puzzle.regions, cats);
    return new Set(conflicts.map((c) => `${c.row},${c.col}`));
  }, [puzzle, cats]);

  useEffect(() => {
    if (!puzzle || won || lost) return;
    if (isSolved(puzzle.size, puzzle.regions, cats)) {
      const scoreEarned = scoreForCompletion(puzzle.size, hintsUsed, autoCatsUsed);
      completeLevel({ scoreEarned, fishEarned: FISH_REWARD });
      setLastReward({ score: scoreEarned, fish: FISH_REWARD });
      setWon(true);
      playIfEnabled('win');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats, puzzle, lost]);

  function setCell(row: number, col: number, state: CellState) {
    setGrid((prev) => {
      const next = prev.map((r) => r.slice());
      next[row][col] = state;
      return next;
    });
  }

  /** Sets a cell to the paint gesture's target state (see
   * gestureModeRef below) — a no-op if the cell is already there, locked
   * in as 'cat'/'wrong', or out of bounds. Idempotent, so repeatedly
   * re-entering the same cell mid-drag is harmless. */
  function paintCell(row: number, col: number, target: 'x' | 'empty') {
    setGrid((prev) => {
      const current = prev[row]?.[col];
      if (current === undefined || current === 'cat' || current === 'wrong') return prev;
      if (current === target) return prev;
      const next = prev.map((r) => r.slice());
      next[row][col] = target;
      return next;
    });
  }

  /** Double-tapping a cell commits to placing a cat there. If it's
   * actually correct the cat is placed; if not, the guess costs a life
   * and the cell is permanently marked "wrong" (red, locked) — a cell
   * already marked that way can't be re-guessed or lose another life. */
  function handleDoubleTap(row: number, col: number) {
    if (!puzzle) return;
    if (grid[row][col] === 'cat' || grid[row][col] === 'wrong') return;

    if (col === puzzle.solution[row]) {
      setCell(row, col, 'cat');
      playIfEnabled('correct');
      triggerCelebration();
      return;
    }

    setCell(row, col, 'wrong');
    triggerWrongFeedback();
    playIfEnabled('wrong');
    setLives((n) => {
      const next = n - 1;
      if (next <= 0) {
        setLost(true);
        playIfEnabled('lose');
      }
      return next;
    });
  }

  /** Whether the in-progress press-and-drag paints X marks on ('add') or
   * clears them from ('remove') every cell it passes over, decided once
   * from the *first* cell touched — 'x' cells stay 'x' while dragging
   * over an add-gesture, and vice versa. Null means this gesture does
   * nothing (it started on a locked cell, or was consumed as a
   * double-tap). */
  const gestureModeRef = useRef<'add' | 'remove' | null>(null);

  function handleGestureStart(row: number, col: number) {
    if (won || lost) return;
    setHintCell(null);

    const now = Date.now();
    const last = lastTapRef.current;
    const isDoubleTap =
      !!last && last.row === row && last.col === col && now - last.time < DOUBLE_TAP_MS;
    lastTapRef.current = { row, col, time: now };

    if (isDoubleTap) {
      lastTapRef.current = null;
      gestureModeRef.current = null;
      handleDoubleTap(row, col);
      return;
    }

    const current = grid[row]?.[col];
    if (current === undefined || current === 'cat' || current === 'wrong') {
      gestureModeRef.current = null;
      return;
    }
    const mode = current === 'empty' ? 'add' : 'remove';
    gestureModeRef.current = mode;
    paintCell(row, col, mode === 'add' ? 'x' : 'empty');
  }

  function handleGestureMove(row: number, col: number) {
    const mode = gestureModeRef.current;
    if (!mode) return;
    paintCell(row, col, mode === 'add' ? 'x' : 'empty');
  }

  function handleGestureEnd() {
    gestureModeRef.current = null;
  }

  function firstUnsolvedRow(): number | null {
    if (!puzzle) return null;
    for (let r = 0; r < puzzle.size; r++) {
      if (grid[r]?.[puzzle.solution[r]] !== 'cat') return r;
    }
    return null;
  }

  function handleHint() {
    if (!puzzle || won || lost) return;
    const row = firstUnsolvedRow();
    if (row === null) return;
    if (!useHintCharge() && !buyHint()) {
      Alert.alert('Pas assez de poissons', 'Termine des niveaux pour en gagner plus 🐟');
      return;
    }
    setHintsUsed((n) => n + 1);
    setHintCell({ row, col: puzzle.solution[row] });
    setTimeout(() => setHintCell(null), HINT_HIGHLIGHT_MS);
  }

  function handleAutoCat() {
    if (!puzzle || won || lost) return;
    const row = firstUnsolvedRow();
    if (row === null) return;
    if (!useAutoCatCharge() && !buyAutoCat()) {
      Alert.alert('Pas assez de poissons', 'Termine des niveaux pour en gagner plus 🐟');
      return;
    }
    setAutoCatsUsed((n) => n + 1);
    setCell(row, puzzle.solution[row], 'cat');
  }

  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.shakeArea, { transform: [{ translateX: shakeTranslate }] }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inner}>
            <TopBar level={activeLevel} score={score} onBack={onBack} onSettings={onSettings} />

            <ProgressBadges
              catsPlaced={cats.length}
              catsTotal={size}
              lives={lives}
              maxLives={MAX_LIVES}
            />

            <RuleCards />

            <View style={styles.boardArea}>
              <Celebration trigger={celebration} />
              {loading || !puzzle ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              ) : (
                <Board
                  size={puzzle.size}
                  regions={puzzle.regions}
                  grid={grid}
                  conflictKeys={conflictKeys}
                  hintCell={hintCell}
                  onCellGestureStart={handleGestureStart}
                  onCellGestureMove={handleGestureMove}
                  onCellGestureEnd={handleGestureEnd}
                  revealKey={`${activeLevel}-${attempt}`}
                />
              )}
            </View>

            <View style={styles.powerRow}>
              <PowerButton emoji="🐱" count={autoCats} onPress={handleAutoCat} />
              <PowerButton emoji="💡" count={hints} onPress={handleHint} />
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      <WinModal
        visible={won}
        level={activeLevel}
        scoreEarned={lastReward.score}
        fishEarned={lastReward.fish}
        onNext={() => {
          setWon(false);
          setActiveLevel((l) => l + 1);
        }}
        onHome={onBack}
      />

      <LoseModal
        visible={lost}
        level={activeLevel}
        onRetry={() => {
          setLost(false);
          setAttempt((a) => a + 1);
        }}
        onHome={onBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  shakeArea: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    gap: 16,
  },
  boardArea: {
    position: 'relative',
  },
  loading: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
});
