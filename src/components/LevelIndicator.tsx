import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, useTheme } from '../theme';

export interface LevelIndicatorProps {
  level: number | null;
  kanjiPassed?: number | null;
  kanjiTotal?: number | null;
  testID?: string;
}

export function LevelIndicator({
  level,
  kanjiPassed,
  kanjiTotal,
  testID,
}: LevelIndicatorProps) {
  const theme = useTheme();

  if (level === null) {
    return null;
  }

  const showProgress =
    kanjiPassed !== null &&
    kanjiPassed !== undefined &&
    kanjiTotal !== null &&
    kanjiTotal !== undefined &&
    kanjiTotal > 0;

  const progressPercent = showProgress ? (kanjiPassed / kanjiTotal) * 100 : 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.secondary },
      ]}
      testID={testID ?? 'level-indicator'}
    >
      <View style={styles.row}>
        <View style={styles.levelBadge}>
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
        {showProgress && (
          <View style={styles.progressSection}>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.colors.border.light },
              ]}
              testID="level-progress-bar"
            >
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
                testID="level-progress-fill"
              />
            </View>
            <Text
              style={[
                styles.progressText,
                { color: theme.colors.text.secondary },
              ]}
              testID="level-progress-text"
            >
              {kanjiPassed}/{kanjiTotal} kanji learned
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  levelBadge: {
    alignItems: 'center',
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
  progressSection: {
    flex: 1,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.subject.kanji,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
});
