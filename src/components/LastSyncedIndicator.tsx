import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';
import { useTheme } from '../theme/ThemeContext';

export interface LastSyncedIndicatorProps {
  lastSyncedAt: Date | null;
  hasPendingContent?: boolean;
  testID?: string;
}

/**
 * Formats a time difference into a human-readable string.
 */
export function formatTimeSince(date: Date | null): string {
  if (date === null) {
    return 'Never synced';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  }

  if (diffMinutes === 1) {
    return '1 minute ago';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  }

  if (diffHours === 1) {
    return '1 hour ago';
  }

  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }

  if (diffDays === 1) {
    return '1 day ago';
  }

  return `${diffDays} days ago`;
}

export function LastSyncedIndicator({
  lastSyncedAt,
  hasPendingContent = false,
  testID,
}: LastSyncedIndicatorProps) {
  const { colors } = useTheme();
  const timeString = formatTimeSince(lastSyncedAt);
  const accentColor = hasPendingContent
    ? COLORS.status.pendingSync
    : COLORS.feedback.correct;

  const dynamicStyles = useMemo(
    () => ({
      badge: {
        backgroundColor: colors.background.secondary,
      },
      label: {
        color: colors.text.secondary,
      },
    }),
    [colors],
  );

  return (
    <View style={styles.container} testID={testID ?? 'last-synced-indicator'}>
      <View style={[styles.badge, dynamicStyles.badge]}>
        <View style={[styles.dot, { backgroundColor: accentColor }]} />
        <Text style={[styles.label, dynamicStyles.label]}>Last synced:</Text>
        <Text style={[styles.value, { color: accentColor }]}>{timeString}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: FONT_SIZES.sm,
  },
  value: {
    fontSize: FONT_SIZES.base,
    fontWeight: 'bold',
  },
});
