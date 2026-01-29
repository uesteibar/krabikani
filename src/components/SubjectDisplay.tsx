import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { SubjectType } from '../api/types';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  TEXT_STYLES,
  getSubjectColor,
} from '../theme';
import { SrsLevelBadge } from './SrsLevelBadge';
import {
  AnimatedSrsLevelBadge,
  type AnimatedSrsLevelBadgeProps,
} from './AnimatedSrsLevelBadge';

export type FeedbackState = 'correct' | 'incorrect' | 'fuzzyMatch' | null;

export type SrsBadge =
  | { type: 'static'; stage: number }
  | ({
      type: 'animated';
    } & Omit<AnimatedSrsLevelBadgeProps, 'testID'>);

export interface SubjectDisplayProps {
  subjectType: SubjectType;
  displayMode: 'characters' | 'meaning';
  displayText: string;
  feedbackState?: FeedbackState;
  srsBadge?: SrsBadge;
  subjectTypeLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const FEEDBACK_LABELS: Record<string, string> = {
  correct: 'Correct!',
  incorrect: 'Incorrect',
  fuzzyMatch: 'Close Enough!',
};

const FEEDBACK_COLORS: Record<string, string> = {
  correct: COLORS.feedback.correct,
  incorrect: COLORS.feedback.incorrect,
  fuzzyMatch: COLORS.feedback.fuzzyMatch,
};

export function SubjectDisplay({
  subjectType,
  displayMode,
  displayText,
  feedbackState,
  srsBadge,
  subjectTypeLabel,
  style,
  testID,
}: SubjectDisplayProps) {
  const backgroundColor = feedbackState
    ? FEEDBACK_COLORS[feedbackState]
    : getSubjectColor(subjectType);

  return (
    <View
      style={[styles.container, { backgroundColor }, style]}
      testID={testID ?? 'subject-display'}
    >
      <Text
        style={
          displayMode === 'characters'
            ? styles.charactersText
            : styles.meaningText
        }
        testID="subject-display-text"
      >
        {displayText}
      </Text>

      {feedbackState && (
        <Text
          style={[
            styles.feedbackLabel,
            feedbackState === 'incorrect' && styles.feedbackLabelLarge,
          ]}
          testID="subject-display-feedback-label"
        >
          {FEEDBACK_LABELS[feedbackState]}
        </Text>
      )}

      {!feedbackState && subjectTypeLabel && (
        <Text style={styles.subjectTypeLabel} testID="subject-type-label">
          {subjectTypeLabel}
        </Text>
      )}

      {srsBadge && (
        <View style={styles.srsBadgeContainer}>
          {srsBadge.type === 'static' ? (
            <SrsLevelBadge stage={srsBadge.stage} testID="srs-badge" />
          ) : (
            <AnimatedSrsLevelBadge
              stage={srsBadge.stage}
              fromStage={srsBadge.fromStage}
              animateLevelUp={srsBadge.animateLevelUp}
              animateLevelDown={srsBadge.animateLevelDown}
              onAnimationComplete={srsBadge.onAnimationComplete}
              testID="srs-badge-animated"
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 232,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charactersText: {
    fontSize: FONT_SIZES.display,
    ...TEXT_STYLES.japaneseDisplay,
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
  meaningText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
  feedbackLabel: {
    position: 'absolute',
    bottom: SPACING.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  feedbackLabelLarge: {
    fontSize: FONT_SIZES.lg,
  },
  subjectTypeLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.sm,
    textTransform: 'capitalize',
  },
  srsBadgeContainer: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.lg,
  },
});
