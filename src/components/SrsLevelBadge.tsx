import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { getSrsLevelInfo, FONT_SIZES } from '../theme';

export interface SrsLevelBadgeProps {
  stage: number;
  testID?: string;
}

/**
 * Displays an SRS level badge showing the current level name.
 * Text is displayed in a semi-transparent white, slightly lighter than the background.
 */
export function SrsLevelBadge({ stage, testID }: SrsLevelBadgeProps) {
  const levelInfo = getSrsLevelInfo(stage);

  // Don't render for invalid stages
  if (!levelInfo) {
    return null;
  }

  return (
    <Text style={styles.name} testID={testID ?? 'srs-level-badge'}>
      {levelInfo.name}
    </Text>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
