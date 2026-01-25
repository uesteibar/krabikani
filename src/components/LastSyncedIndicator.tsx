import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface LastSyncedIndicatorProps {
  lastSyncedAt: Date | null;
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
  testID,
}: LastSyncedIndicatorProps) {
  const timeString = formatTimeSince(lastSyncedAt);

  return (
    <View
      style={styles.container}
      testID={testID ?? 'last-synced-indicator'}
    >
      <Text style={styles.text}>Last synced: {timeString}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  text: {
    color: '#666',
    fontSize: 12,
  },
});
