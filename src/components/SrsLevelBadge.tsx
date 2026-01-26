import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  getSrsLevelInfo,
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
 * Displays an SRS level badge showing the current level name.
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

  return (
    <View
      style={[styles.container, { backgroundColor: levelInfo.color }]}
      testID={testID ?? 'srs-level-badge'}
    >
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
  },
  name: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
