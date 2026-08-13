import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

export interface CelebrationTrigger {
  /** Bumped on every trigger so the same word picked twice in a row still
   * replays the animation. */
  id: number;
  word: string;
}

interface CelebrationProps {
  trigger: CelebrationTrigger | null;
}

const HOLD_MS = 500;
const FADE_MS = 220;

/** A brief "👏 Excellent ! 👏" pop that floats above the board when a cat
 * is correctly guessed — pure visual reward, doesn't block input. */
export function Celebration({ trigger }: CelebrationProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const [word, setWord] = useState<string | null>(null);

  useEffect(() => {
    if (!trigger) return;
    setWord(trigger.word);
    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }),
      Animated.delay(HOLD_MS),
      Animated.timing(anim, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setWord(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger?.id]);

  if (!word) return null;

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity: anim, transform: [{ scale }, { translateY }] }]}
    >
      <Text style={styles.clap}>👏</Text>
      <Text style={styles.word}>{word}</Text>
      <Text style={styles.clap}>👏</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: -34,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  clap: {
    fontSize: 24,
  },
  word: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accentDark,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
});
