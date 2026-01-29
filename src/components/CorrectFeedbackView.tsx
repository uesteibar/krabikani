import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { SubjectType } from '../api/types';
import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZES,
  SPACING,
  getSubjectColor,
} from '../theme';
import { SubjectDisplay, type FeedbackState, type SrsBadge } from './SubjectDisplay';
import { QuestionTypeLabel, type QuestionTypeLabelType } from './QuestionTypeLabel';

export interface CorrectFeedbackViewProps {
  subjectType: SubjectType;
  displayText: string;
  displayMode: 'characters' | 'meaning';
  feedbackState: 'correct' | 'fuzzyMatch';
  srsBadge?: SrsBadge;
  questionType: QuestionTypeLabelType;
  inputValue: string;
  testID?: string;
}

export function CorrectFeedbackView({
  subjectType,
  displayText,
  displayMode,
  feedbackState,
  srsBadge,
  questionType,
  inputValue,
  testID,
}: CorrectFeedbackViewProps) {
  const borderColor = getSubjectColor(subjectType);

  return (
    <View testID={testID ?? 'correct-feedback-view'}>
      <SubjectDisplay
        subjectType={subjectType}
        displayMode={displayMode}
        displayText={displayText}
        feedbackState={feedbackState as FeedbackState}
        srsBadge={srsBadge}
        testID="correct-feedback-subject-display"
      />

      <QuestionTypeLabel type={questionType} testID="correct-feedback-question-type" />

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { borderColor }]}
          value={inputValue}
          editable={false}
          testID="correct-feedback-input"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  input: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: COLORS.background.input,
  },
});
