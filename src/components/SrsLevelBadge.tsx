import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  getSrsLevelInfo,
  SrsLevelKey,
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../theme';

export interface SrsLevelBadgeProps {
  stage: number;
  testID?: string;
}

/**
 * Icons for each SRS level - bar style progression with flame for burned.
 */
const LEVEL_ICONS: Record<SrsLevelKey, string> = {
  apprentice: '▁',
  guru: '▃',
  master: '▅',
  enlightened: '▇',
  burned: '🔥',
};

/**
 * Displays an SRS level badge showing the current level name with an icon.
 * Uses WaniKani official colors for each level:
 * - Apprentice (#DD0093) - Pink
 * - Guru (#882D9E) - Purple
 * - Master (#294DDB) - Blue
 * - Enlightened (#0093DD) - Cyan
 * - Burned (#434343) - Gray
 */
export function SrsLevelBadge({ stage, testID }: SrsLevelBadgeProps) {
  const levelInfo = getSrsLevelInfo(stage);

  // Don't render for invalid stages
  if (!levelInfo) {
    return null;
  }

  const icon = LEVEL_ICONS[levelInfo.key];

  return (
    <View
      style={[styles.container, { backgroundColor: levelInfo.color }]}
      testID={testID ?? 'srs-level-badge'}>
      <Text style={styles.icon} testID="srs-level-icon">
        {icon}
      </Text>
      <Text style={styles.name} testID="srs-level-name">
        {levelInfo.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  icon: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.inverse,
  },
  name: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
