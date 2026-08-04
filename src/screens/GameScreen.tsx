import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Board } from '../components/Board';
import { TopBar } from '../components/TopBar';
import { RuleCards } from '../components/RuleCard';
import { ProgressBadges } from '../components/ProgressBadges';
import { PowerButton } from '../components/PowerButton';
import { WinModal } from '../components/WinModal';
import { generatePuzzle } from '../engine/generator';
import { findConflicts, isSolved } from '../engine/solver';
import type { CellState, Puzzle } from '../engine/types';
import { levelToSize, scoreForCompletion } from '../utils/levelConfig';
import { useGameStore } from '../state/store';
import { colors } from '../theme/colors';

const FISH_REWARD = 3;
const HINT_HIGHLIGHT_MS = 2500;

function emptyGrid(size: number): CellState[][] {
  return Array.from({ length: size }, () => new Array<CellState>(size).fill('empty'));
}

function nextCellState(state: CellState): CellState {
  if (state === 'empty') return 'x';
  if (state === 'x') return 'cat';
  return 'empty';
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
  const fish = useGameStore((s) => s.fish);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const useHintCharge = useGameStore((s) => s.useHint);
  const useAutoCatCharge = useGameStore((s) => s.useAutoCat);
  const buyHint = useGameStore((s) => s.buyHint);
  const buyAutoCat = useGameStore((s) => s.buyAutoCat);

  // The puzzle on screen tracks its own level rather than the store's
  // (which advances the instant a level is completed): otherwise the win
  // modal would find its level already stale and a fresh board already
  // generated underneath it before the player ever sees "Niveau suivant".
  const [activeLevel, setActiveLevel] = useState(level);
  const size = levelToSize(activeLevel);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [loading, setLoading] = useState(true);
  const [hintCell, setHintCell] = useState<{ row: number; col: number } | null>(null);
  const [won, setWon] = useState(false);
  const [lastReward, setLastReward] = useState({ score: 0, fish: 0 });
  const [hintsUsed, setHintsUsed] = useState(0);
  const [autoCatsUsed, setAutoCatsUsed] = useState(0);

  useEffect(() => {
    setLoading(true);
    setWon(false);
    setHintCell(null);
    setHintsUsed(0);
    setAutoCatsUsed(0);
    const timer = setTimeout(() => {
      const p = generatePuzzle(size);
      setPuzzle(p);
      setGrid(emptyGrid(size));
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel]);

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
    if (!puzzle || won) return;
    if (isSolved(puzzle.size, puzzle.regions, cats)) {
      const scoreEarned = scoreForCompletion(puzzle.size, hintsUsed, autoCatsUsed);
      completeLevel({ scoreEarned, fishEarned: FISH_REWARD });
      setLastReward({ score: scoreEarned, fish: FISH_REWARD });
      setWon(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats, puzzle]);

  function handleCellPress(row: number, col: number) {
    if (won) return;
    setHintCell(null);
    setGrid((prev) => {
      const next = prev.map((r) => r.slice());
      next[row][col] = nextCellState(next[row][col]);
      return next;
    });
  }

  function firstUnsolvedRow(): number | null {
    if (!puzzle) return null;
    for (let r = 0; r < puzzle.size; r++) {
      if (grid[r]?.[puzzle.solution[r]] !== 'cat') return r;
    }
    return null;
  }

  function handleHint() {
    if (!puzzle || won) return;
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
    if (!puzzle || won) return;
    const row = firstUnsolvedRow();
    if (row === null) return;
    if (!useAutoCatCharge() && !buyAutoCat()) {
      Alert.alert('Pas assez de poissons', 'Termine des niveaux pour en gagner plus 🐟');
      return;
    }
    setAutoCatsUsed((n) => n + 1);
    const col = puzzle.solution[row];
    setGrid((prev) => {
      const next = prev.map((r) => r.slice());
      next[row][col] = 'cat';
      return next;
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TopBar level={activeLevel} score={score} onBack={onBack} onSettings={onSettings} />

        <ProgressBadges catsPlaced={cats.length} catsTotal={size} fishReward={FISH_REWARD} />

        <RuleCards />

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
            onCellPress={handleCellPress}
          />
        )}

        <View style={styles.powerRow}>
          <PowerButton emoji="🐱" count={autoCats} onPress={handleAutoCat} />
          <PowerButton emoji="💡" count={hints} onPress={handleHint} />
        </View>
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
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
