import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { PressableScale } from './PressableScale';

interface TopBarProps {
  level: number;
  score: number;
  onBack: () => void;
  onSettings: () => void;
}

export function TopBar({ level, score, onBack, onSettings }: TopBarProps) {
  return (
    <View style={styles.row}>
      <RoundButton icon="←" onPress={onBack} />
      <View style={styles.center}>
        <Stat label="Niveau" value={String(level)} />
        <Stat label="Score" value={String(score)} />
      </View>
      <RoundButton icon="⚙" onPress={onSettings} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function RoundButton({ icon, onPress }: { icon: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.round} onPress={onPress} accessibilityRole="button">
      <Text style={styles.roundIcon}>{icon}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  center: {
    flexDirection: 'row',
    gap: 28,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: colors.inkSoft,
    fontSize: 15,
  },
  statValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '700',
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  roundIcon: {
    fontSize: 20,
    color: colors.ink,
  },
});
