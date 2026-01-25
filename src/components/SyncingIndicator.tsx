import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';

export interface SyncingIndicatorProps {
  /** Whether sync is in progress */
  isSyncing: boolean;
}

/**
 * Shows an indicator when a sync is in progress from pull-to-refresh.
 * This is informative only - no cancel option.
 */
export function SyncingIndicator({ isSyncing }: SyncingIndicatorProps) {
  if (!isSyncing) {
    return null;
  }

  return (
    <View style={styles.container} testID="syncing-indicator">
      <ActivityIndicator
        size="small"
        color={COLORS.subject.vocabulary}
        testID="syncing-indicator-spinner"
      />
      <Text style={styles.text}>Syncing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.secondary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  text: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    marginLeft: SPACING.sm,
  },
});
