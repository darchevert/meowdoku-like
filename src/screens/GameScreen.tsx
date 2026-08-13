import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { DAILY_CHALLENGE_FISH_REWARD, DAILY_CHALLENGE_SIZE, generateDailyPuzzle } from '../utils/dailyChallenge';
import { playSound } from '../utils/sounds';
import { showRewardedAd } from '../utils/ads';
import { useGameStore } from '../state/store';
import { colors } from '../theme/colors';
import { MAX_CONTENT_WIDTH } from '../theme/layout';

// Rewarded ads need a native SDK (see utils/ads.ts) that can't run in a
// browser tab — hidden on web rather than offering a button that could
// never show a real ad there once the mock is swapped for the real one.
const ADS_SUPPORTED = Platform.OS !== 'web';

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
  /** Plays the single shared daily puzzle instead of the level ladder:
   * fixed size, deterministic per-date board, one completion per day, no
   * "next level" progression. */
  daily?: boolean;
}

export function GameScreen({ onBack, onSettings, daily = false }: GameScreenProps) {
  const level = useGameStore((s) => s.level);
  const score = useGameStore((s) => s.score);
  const hints = useGameStore((s) => s.hints);
  const autoCats = useGameStore((s) => s.autoCats);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const completeDailyChallenge = useGameStore((s) => s.completeDailyChallenge);
  const useHintCharge = useGameStore((s) => s.useHint);
  const useAutoCatCharge = useGameStore((s) => s.useAutoCat);
  const buyHint = useGameStore((s) => s.buyHint);
  const buyAutoCat = useGameStore((s) => s.buyAutoCat);
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const zenModeEnabled = useGameStore((s) => s.zenModeEnabled);
  const timerModeEnabled = useGameStore((s) => s.timerModeEnabled);
  const recordBestTime = useGameStore((s) => s.recordBestTime);
  const grantHint = useGameStore((s) => s.grantHint);

  // The daily challenge always keeps its real stakes — zen mode is a
  // level-play comfort setting, not something that should water down the
  // one shared, one-shot puzzle of the day.
  const zenActive = zenModeEnabled && !daily;

  // The puzzle on screen tracks its own level rather than the store's
  // (which advances the instant a level is completed): otherwise the win
  // modal would find its level already stale and a fresh board already
  // generated underneath it before the player ever sees "Niveau suivant".
  const [activeLevel, setActiveLevel] = useState(level);
  // Bumped on retry so a fresh puzzle regenerates for the *same* level.
  // In daily mode this still fires on retry, but the puzzle it generates
  // is deterministic from the date, so it comes back identical anyway.
  const [attempt, setAttempt] = useState(0);
  const size = daily ? DAILY_CHALLENGE_SIZE : levelToSize(activeLevel);
  // Captured once on mount rather than derived from the live store value,
  // so completing the daily challenge this session doesn't retroactively
  // hide the board the player is mid-game on.
  const [alreadyDoneToday] = useState(
    () => daily && useGameStore.getState().hasCompletedDailyToday()
  );
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

  // Undo: one history entry per user gesture (not per cell touched
  // mid-drag), so undoing a whole drag stroke — or a wrong double-tap
  // guess, lives included — is a single step. A ref avoids re-rendering
  // on every push; `canUndo` mirrors "is it non-empty" for the button.
  const historyRef = useRef<Array<{ grid: CellState[][]; lives: number }>>([]);
  const [canUndo, setCanUndo] = useState(false);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [lastElapsedSec, setLastElapsedSec] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

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
    if (alreadyDoneToday) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setWon(false);
    setLost(false);
    setLives(MAX_LIVES);
    setHintCell(null);
    setHintsUsed(0);
    setAutoCatsUsed(0);
    lastTapRef.current = null;
    historyRef.current = [];
    setCanUndo(false);
    setElapsedSec(0);
    setIsNewRecord(false);
    const timer = setTimeout(() => {
      const p = daily ? generateDailyPuzzle() : generatePuzzle(size);
      setPuzzle(p);
      setGrid(emptyGrid(size));
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel, attempt]);

  useEffect(() => {
    if (!timerModeEnabled || loading || !puzzle || won || lost) return;
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerModeEnabled, loading, puzzle, won, lost]);

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
      const fishEarned = daily ? DAILY_CHALLENGE_FISH_REWARD : FISH_REWARD;
      if (daily) {
        completeDailyChallenge({ scoreEarned, fishEarned });
      } else {
        completeLevel({ scoreEarned, fishEarned });
      }
      setLastReward({ score: scoreEarned, fish: fishEarned });
      if (timerModeEnabled) {
        setLastElapsedSec(elapsedSec);
        setIsNewRecord(recordBestTime(puzzle.size, elapsedSec));
      }
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

  /** Snapshots grid+lives just before a mutating gesture, so `handleUndo`
   * can restore both together — undoing a wrong guess should give the
   * life back too, not just erase the red mark. Call once per gesture,
   * right before the mutation it's about to make. */
  function pushHistory() {
    historyRef.current.push({ grid: grid.map((r) => r.slice()), lives });
    setCanUndo(true);
  }

  function handleUndo() {
    const entry = historyRef.current.pop();
    if (!entry) return;
    setCanUndo(historyRef.current.length > 0);
    setGrid(entry.grid);
    setLives(entry.lives);
    setLost(false);
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
   * already marked that way can't be re-guessed or lose another life.
   * In zen mode (regular levels only, never the daily challenge) a wrong
   * guess still gets marked and still gives feedback, it just doesn't
   * cost a life or end the level. */
  function handleDoubleTap(row: number, col: number) {
    if (!puzzle) return;
    if (grid[row][col] === 'cat' || grid[row][col] === 'wrong') return;
    pushHistory();

    if (col === puzzle.solution[row]) {
      setCell(row, col, 'cat');
      playIfEnabled('correct');
      triggerCelebration();
      return;
    }

    setCell(row, col, 'wrong');
    triggerWrongFeedback();
    playIfEnabled('wrong');
    if (zenActive) return;
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
    pushHistory();
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

  const [adLoading, setAdLoading] = useState(false);

  /** Watch a rewarded ad for a free hint charge — see utils/ads.ts for
   * why this currently plays a simulated ad rather than a real one. */
  async function handleWatchAd() {
    if (adLoading) return;
    setAdLoading(true);
    const rewarded = await showRewardedAd();
    setAdLoading(false);
    if (rewarded) grantHint();
  }

  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  if (alreadyDoneToday) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inner}>
            <TopBar titleLabel="Défi" titleValue="du jour" score={score} onBack={onBack} onSettings={onSettings} />
            <View style={styles.doneCard}>
              <Text style={styles.doneEmoji}>🐱✅</Text>
              <Text style={styles.doneTitle}>Défi du jour déjà réussi !</Text>
              <Text style={styles.doneSubtitle}>Reviens demain pour un nouveau défi.</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.shakeArea, { transform: [{ translateX: shakeTranslate }] }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inner}>
            <TopBar
              titleLabel={daily ? 'Défi' : 'Niveau'}
              titleValue={daily ? 'du jour' : String(activeLevel)}
              score={score}
              onBack={onBack}
              onSettings={onSettings}
            />

            <ProgressBadges
              catsPlaced={cats.length}
              catsTotal={size}
              lives={lives}
              maxLives={MAX_LIVES}
              zen={zenActive}
            />

            {timerModeEnabled && (
              <Text style={styles.timer}>
                ⏱ {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
              </Text>
            )}

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
              <PowerButton emoji="↩" onPress={handleUndo} disabled={!canUndo} />
              <PowerButton emoji="🐱" count={autoCats} onPress={handleAutoCat} />
              <PowerButton emoji="💡" count={hints} onPress={handleHint} />
              {ADS_SUPPORTED && (
                <PowerButton
                  emoji={adLoading ? '⏳' : '📺'}
                  onPress={handleWatchAd}
                  disabled={adLoading}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      <WinModal
        visible={won}
        title={daily ? 'Défi du jour terminé !' : `Niveau ${activeLevel} terminé !`}
        scoreEarned={lastReward.score}
        fishEarned={lastReward.fish}
        primaryLabel={daily ? 'Accueil' : 'Niveau suivant'}
        onPrimary={
          daily
            ? onBack
            : () => {
                setWon(false);
                setActiveLevel((l) => l + 1);
              }
        }
        secondaryLabel={daily ? undefined : 'Accueil'}
        onSecondary={daily ? undefined : onBack}
        elapsedSeconds={timerModeEnabled ? lastElapsedSec : undefined}
        isNewRecord={isNewRecord}
      />

      <LoseModal
        visible={lost}
        title={daily ? 'Défi du jour raté' : `Niveau ${activeLevel} raté`}
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
  timer: {
    alignSelf: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  doneCard: {
    marginTop: 48,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
  },
  doneEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  doneTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  doneSubtitle: {
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});
