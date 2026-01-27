import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  useTheme,
} from '../theme';

export interface LevelIndicatorProps {
  level: number | null;
  testID?: string;
}

/**
 * Displays the user's current WaniKani level in a prominent badge.
 * Shows a large level number with "LEVEL" label when available, nothing when loading.
 */
export function LevelIndicator({ level, testID }: LevelIndicatorProps) {
  const theme = useTheme();

  // Don't render anything while loading (level is null)
  if (level === null) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.secondary },
      ]}
      testID={testID ?? 'level-indicator'}
    >
      <Text
        style={[styles.label, { color: theme.colors.text.secondary }]}
        testID="level-label"
      >
        LEVEL
      </Text>
      <Text
        style={[styles.number, { color: theme.colors.text.primary }]}
        testID="level-text"
      >
        {level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  number: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    lineHeight: FONT_SIZES.xxxl + 4,
  },
});
