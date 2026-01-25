import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING, FONT_SIZES } from '../theme';

export interface LevelIndicatorProps {
  level: number | null;
  testID?: string;
}

/**
 * Displays the user's current WaniKani level.
 * Shows "Level X" when level is available, nothing when loading.
 */
export function LevelIndicator({ level, testID }: LevelIndicatorProps) {
  // Don't render anything while loading (level is null)
  if (level === null) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID ?? 'level-indicator'}>
      <Text style={styles.text} testID="level-text">
        Level {level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  text: {
    color: COLORS.text.secondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
});
