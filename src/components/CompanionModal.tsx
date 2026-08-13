import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { useGameStore } from '../state/store';
import { PressableScale } from './PressableScale';
import { ACCESSORIES, companionProgress, companionTier } from '../utils/companion';

interface CompanionModalProps {
  visible: boolean;
  onClose: () => void;
}

const FEED_COST_FISH = 2;

export function CompanionModal({ visible, onClose }: CompanionModalProps) {
  const fish = useGameStore((s) => s.fish);
  const companionXp = useGameStore((s) => s.companionXp);
  const unlockedAccessories = useGameStore((s) => s.unlockedAccessories);
  const equippedAccessory = useGameStore((s) => s.equippedAccessory);
  const feedCompanion = useGameStore((s) => s.feedCompanion);
  const unlockAccessory = useGameStore((s) => s.unlockAccessory);
  const equipAccessory = useGameStore((s) => s.equipAccessory);

  const tier = companionTier(companionXp);
  const progress = companionProgress(companionXp);
  const equippedEmoji = ACCESSORIES.find((a) => a.id === equippedAccessory)?.emoji;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Compagnon</Text>
            <PressableScale onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </PressableScale>
          </View>

          <View style={styles.showcase}>
            <View style={styles.companionRow}>
              <Text style={styles.companionEmoji}>{tier.emoji}</Text>
              {equippedEmoji && <Text style={styles.accessoryOverlay}>{equippedEmoji}</Text>}
            </View>
            <Text style={styles.companionName}>{tier.name}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>

            <PressableScale
              style={[styles.feedButton, fish < FEED_COST_FISH && styles.feedButtonDisabled]}
              onPress={feedCompanion}
              disabled={fish < FEED_COST_FISH}
            >
              <Text style={styles.feedButtonText}>Nourrir · {FEED_COST_FISH} 🐟</Text>
            </PressableScale>
          </View>

          <Text style={styles.sectionTitle}>Accessoires</Text>
          <ScrollView contentContainerStyle={styles.grid}>
            {ACCESSORIES.map((item) => {
              const unlocked = unlockedAccessories.includes(item.id);
              const equipped = equippedAccessory === item.id;
              return (
                <PressableScale
                  key={item.id}
                  style={[styles.gridItem, equipped && styles.gridItemEquipped]}
                  onPress={() => {
                    if (unlocked) {
                      equipAccessory(equipped ? null : item.id);
                    } else {
                      unlockAccessory(item.id, item.cost);
                    }
                  }}
                >
                  <Text style={[styles.gridEmoji, !unlocked && styles.gridEmojiLocked]}>
                    {item.emoji}
                  </Text>
                  <Text style={styles.gridLabel}>
                    {unlocked ? item.name : `${item.cost} 🐟`}
                  </Text>
                  {equipped && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  close: {
    fontSize: 20,
    color: colors.ink,
  },
  showcase: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    paddingVertical: 20,
    marginBottom: 16,
    gap: 8,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  companionEmoji: {
    fontSize: 72,
  },
  accessoryOverlay: {
    fontSize: 32,
    marginBottom: 8,
  },
  companionName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  progressTrack: {
    width: '80%',
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 5,
  },
  feedButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  feedButtonDisabled: {
    opacity: 0.4,
  },
  feedButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.inkSoft,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 4,
  },
  gridItem: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  gridItemEquipped: {
    borderWidth: 3,
    borderColor: colors.success,
  },
  gridEmoji: {
    fontSize: 26,
  },
  gridEmojiLocked: {
    opacity: 0.35,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
