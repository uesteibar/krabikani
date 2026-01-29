import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SubjectType } from '../api/types';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
} from '../theme';
import { Button } from './Button';
import { MnemonicText } from './MnemonicText';
import { SubjectDisplay, type SrsBadge } from './SubjectDisplay';

export interface IncorrectFeedbackViewProps {
  subjectType: SubjectType;
  displayText: string;
  displayMode: 'characters' | 'meaning';
  userAnswer: string;
  correctAnswer: string;
  mnemonic: string;
  mnemonicLabel: string;
  onContinue: () => void;
  onMarkCorrect?: () => void;
  onAddSynonym?: () => void;
  synonymAddState?: 'adding' | 'added' | null;
  srsBadge?: SrsBadge;
  detailsContent?: React.ReactNode;
  detailsResetKey?: string;
  testID?: string;
}

export function IncorrectFeedbackView({
  subjectType,
  displayText,
  displayMode,
  userAnswer,
  correctAnswer,
  mnemonic,
  mnemonicLabel,
  onContinue,
  onMarkCorrect,
  onAddSynonym,
  synonymAddState,
  srsBadge,
  detailsContent,
  testID = 'incorrect-feedback',
}: IncorrectFeedbackViewProps) {
  return (
    <View style={styles.container} testID={testID}>
      <SubjectDisplay
        subjectType={subjectType}
        displayMode={displayMode}
        displayText={displayText}
        feedbackState="incorrect"
        srsBadge={srsBadge}
        testID={`${testID}-subject-display`}
      />

      <ScrollView
        style={styles.feedbackContainer}
        contentContainerStyle={styles.feedbackContent}
      >
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackLabel} testID={`${testID}-your-answer-label`}>
            Your Answer:
          </Text>
          <Text style={styles.userAnswer} testID={`${testID}-your-answer`}>
            {userAnswer || '(empty)'}
          </Text>
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackLabel} testID={`${testID}-correct-answer-label`}>
            Correct Answer:
          </Text>
          <Text style={styles.correctAnswerText} testID={`${testID}-correct-answer`}>
            {correctAnswer}
          </Text>
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackLabel} testID={`${testID}-mnemonic-label`}>
            {mnemonicLabel}
          </Text>
          <MnemonicText
            text={mnemonic}
            style={styles.mnemonicText}
            testID={`${testID}-mnemonic`}
          />
        </View>

        {detailsContent}
      </ScrollView>

      <View style={styles.buttonRow}>
        {onMarkCorrect && (
          <Button
            label="Mark as Correct"
            onPress={onMarkCorrect}
            variant="secondary"
            testID={`${testID}-mark-correct`}
          />
        )}
        <Button
          label="Continue"
          onPress={onContinue}
          variant="primary"
          style={styles.continueButton}
          testID={`${testID}-continue`}
        />
      </View>

      {onAddSynonym && (
        <View style={styles.addSynonymContainer}>
          <Text
            style={[
              styles.addSynonymText,
              synonymAddState === 'adding' && styles.addSynonymTextPulse,
              synonymAddState === 'added' && styles.addSynonymTextSuccess,
            ]}
            testID={`${testID}-add-synonym-text`}
            onPress={synonymAddState === null ? onAddSynonym : undefined}
          >
            {synonymAddState === null && 'Add as Synonym'}
            {synonymAddState === 'adding' && 'Adding...'}
            {synonymAddState === 'added' && 'Synonym added ✓'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedbackContainer: {
    flex: 1,
  },
  feedbackContent: {
    padding: SPACING.lg,
  },
  feedbackSection: {
    marginBottom: SPACING.xl,
  },
  feedbackLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userAnswer: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.feedback.incorrect,
    fontWeight: '500',
  },
  correctAnswerText: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.feedback.correct,
    fontWeight: 'bold',
  },
  mnemonicText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
    lineHeight: FONT_SIZES.xxl,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  continueButton: {
    flex: 1,
  },
  addSynonymContainer: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  addSynonymText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary,
    textDecorationLine: 'underline',
  },
  addSynonymTextPulse: {
    color: COLORS.text.secondary,
    opacity: 0.7,
  },
  addSynonymTextSuccess: {
    color: COLORS.feedback.correct,
    textDecorationLine: 'none',
  },
});
